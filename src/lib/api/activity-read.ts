import { useQuery } from '@tanstack/react-query';

import type { CachedRead } from '@/lib/offline/cached-read';
import { getOfflineDb } from '@/lib/offline/db';

import { apiFetch } from './client';
import { isApiError } from './errors';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Las actividades se guardan por mes (y la vista de pendientes, con la misma forma) bajo este
// prefijo. Quien escribe esas copias arma sus claves con él; aquí se recorren todas para encontrar
// una actividad suelta.
export const ACTIVITY_CACHE_PREFIX = 'agricultural-activities:';

// Una actividad buscada en las copias guardadas. Una reprogramada puede seguir en la copia vieja
// de su mes anterior: vale la de la copia más reciente.
export async function findSavedActivity(
  userId: string,
  id: string,
): Promise<CachedRead<AgriculturalActivity> | null> {
  const lists = await getOfflineDb(userId)
    .cache.where('key')
    .startsWith(ACTIVITY_CACHE_PREFIX)
    .toArray();
  let found: Required<CachedRead<AgriculturalActivity>> | null = null;
  for (const { value, fetchedAt } of lists) {
    // Estas entradas solo las escriben las lecturas de actividades, siempre con esta forma.
    const activity = (value as AgriculturalActivity[]).find(
      (saved) => saved.id === id,
    );
    if (activity && (!found || fetchedAt > found.savedAt)) {
      found = { data: activity, savedAt: fetchedAt };
    }
  }
  return found;
}

export const fetchActivity = (id: string, signal?: AbortSignal) =>
  apiFetch<AgriculturalActivity>(`/api/agricultural-activities/${id}`, {
    signal,
  });

// Sin respuesta del servidor (sin red) la actividad sale de las copias guardadas, con la fecha de
// esa copia. Un error de la API (ya no existe, sin permiso) se muestra como siempre.
async function readActivity(
  userId: string,
  id: string,
  signal?: AbortSignal,
): Promise<CachedRead<AgriculturalActivity>> {
  try {
    return { data: await fetchActivity(id, signal) };
  } catch (error) {
    if (isApiError(error)) throw error;
    const saved = await findSavedActivity(userId, id).catch(() => null);
    if (!saved) throw error;
    return saved;
  }
}

// Una actividad sola, también sin conexión: la que se va a registrar como realizada o cuyo
// monitoreo se va a registrar.
export const useActivity = (userId: string | undefined, id: string) =>
  useQuery({
    queryKey: queryKeys.agriculturalActivities.detail(id),
    queryFn: ({ signal }) => readActivity(userId!, id, signal),
    enabled: !!userId && !!id,
    networkMode: 'offlineFirst',
  });
