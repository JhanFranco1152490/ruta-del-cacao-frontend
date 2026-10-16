import { queryOptions, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { monthBounds, todayInBogota } from '@/lib/format/dates';
import { type CachedRead, readThroughCache } from '@/lib/offline/cached-read';

import {
  collectorsCacheKey,
  findSavedHarvest,
  harvestMonthCacheKey,
  offlineWindowMonths,
} from './harvest-cache';

type Schemas = components['schemas'];
export type Harvest = Schemas['Harvest'];
// Una cuenta que puede ser recolectora: con las fincas en las que trabaja y si quien pregunta
// puede nombrarla.
export type CollectorOption = Schemas['CollectorOption'];

export const HARVEST_ERROR = {
  plotNotCharacterized: 'plot_not_characterized',
  varietyNotInPlot: 'variety_not_in_plot',
  collectorNotAvailable: 'collector_not_available',
  inLot: 'harvest_in_lot',
  idConflict: 'harvest_id_conflict',
  staleVersion: 'stale_version',
} as const;

// La consulta pide un periodo y no se pagina: los filtros y los totales corren en el dispositivo,
// también sin conexión. `producer` solo lo envía la cuenta técnica.
export async function fetchHarvests(
  { from, to, producer }: { from: string; to: string; producer: string | null },
  signal?: AbortSignal,
): Promise<Harvest[]> {
  const params = new URLSearchParams({ from, to });
  if (producer) params.set('producer', producer);
  const { results } = await apiFetch<Schemas['HarvestList']>(
    `/api/harvests?${params}`,
    { signal },
  );
  return results;
}

const windowsInFlight = new Map<string, Promise<void>>();

// Guarda la copia de los meses que se llevan a campo, menos el que se está viendo (que se acaba de
// guardar). Corre una sola vez a la vez por persona y productor, y un mes que falla no impide
// guardar el otro.
function saveOfflineWindow(
  userId: string,
  producer: string | null,
  viewedMonth: string,
): Promise<void> {
  const key = `${userId}:${producer ?? ''}`;
  const running = windowsInFlight.get(key);
  if (running) return running;
  const months = offlineWindowMonths(todayInBogota()).filter(
    (month) => month !== viewedMonth,
  );
  const saving = Promise.allSettled(
    months.map((month) =>
      readThroughCache(userId, harvestMonthCacheKey(producer, month), () =>
        fetchHarvests({ ...monthBounds(month), producer }),
      ),
    ),
  )
    .then(() => undefined)
    .finally(() => windowsInFlight.delete(key));
  windowsInFlight.set(key, saving);
  return saving;
}

// Las cosechas recogidas en un mes (yyyy-MM), con copia en el dispositivo. Cuando la lectura llega
// del servidor, además se renueva la copia de los meses que se llevan a campo.
export const harvestMonthQuery = (
  userId: string | undefined,
  month: string,
  producer: string | null,
) =>
  queryOptions({
    queryKey: queryKeys.harvests.month(producer, month),
    queryFn: async ({ signal }) => {
      const read = await readThroughCache(
        userId!,
        harvestMonthCacheKey(producer, month),
        () => fetchHarvests({ ...monthBounds(month), producer }, signal),
      );
      // Sin `savedAt` la lectura llegó del servidor: hay red para guardar el resto. No se espera,
      // para que la lista aparezca con su mes.
      if (read.savedAt === undefined) {
        void saveOfflineWindow(userId!, producer, month);
      }
      return read;
    },
    enabled: !!userId,
    networkMode: 'offlineFirst',
  });

export const useHarvestsOfMonth = (
  userId: string | undefined,
  month: string,
  producer: string | null,
) => useQuery(harvestMonthQuery(userId, month, producer));

export const fetchHarvest = (id: string, signal?: AbortSignal) =>
  apiFetch<Harvest>(`/api/harvests/${id}`, { signal });

// Sin respuesta del servidor (sin red) la cosecha sale de los meses guardados, con la fecha de esa
// copia. Un error de la API (ya no existe, sin permiso) se muestra como siempre.
async function readHarvest(
  userId: string,
  id: string,
  signal?: AbortSignal,
): Promise<CachedRead<Harvest>> {
  try {
    return { data: await fetchHarvest(id, signal) };
  } catch (error) {
    if (isApiError(error)) throw error;
    const saved = await findSavedHarvest(userId, id).catch(() => null);
    if (!saved) throw error;
    return saved;
  }
}

export const useHarvest = (userId: string | undefined, id: string) =>
  useQuery({
    queryKey: queryKeys.harvests.detail(id),
    queryFn: ({ signal }) => readHarvest(userId!, id, signal),
    enabled: !!userId && !!id,
    networkMode: 'offlineFirst',
  });

export async function fetchHarvestCollectors(
  { producer }: { producer: string | null },
  signal?: AbortSignal,
): Promise<CollectorOption[]> {
  const suffix = producer ? `?${new URLSearchParams({ producer })}` : '';
  const { results } = await apiFetch<Schemas['CollectorList']>(
    `/api/harvests/collectors${suffix}`,
    { signal },
  );
  return results;
}

// Las cuentas que pueden recolectar, activas e inactivas: las inactivas siguen apareciendo en sus
// cosechas, pero el formulario solo ofrece las activas. Con copia en el dispositivo, porque la
// cosecha se registra en campo.
export const useHarvestCollectors = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.harvests.collectors(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, collectorsCacheKey(producer), () =>
        fetchHarvestCollectors({ producer }, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// El alta llega siempre desde la cola del dispositivo.
export const postHarvest = (body: Schemas['HarvestCreateRequest']) =>
  apiFetch<Harvest>('/api/harvests', { method: 'POST', body });
