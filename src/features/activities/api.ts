import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { monthBounds } from '@/lib/format/dates';
import { type CachedRead, readThroughCache } from '@/lib/offline/cached-read';

import {
  activityMonthCacheKey,
  assigneesCacheKey,
  findSavedActivity,
} from './activity-cache';

type Schemas = components['schemas'];
export type AgriculturalActivity = Schemas['AgriculturalActivity'];
export type Assignee = Schemas['Assignee'];
export type UsedInput = Schemas['UsedInputOutput'];
export type ActivityCreateRequest = Schemas['ActivityCreateRequest'];

export const ACTIVITY_ERROR = {
  staleVersion: 'stale_version',
  alreadyDone: 'activity_already_done',
  overdue: 'activity_overdue',
  plotInactive: 'plot_inactive',
  farmInactive: 'farm_inactive',
} as const;

// La consulta pide un periodo y no se pagina: los filtros corren en el dispositivo, también sin
// conexión. `producer` solo lo envía la cuenta técnica; las demás cuentas ven su productor.
export async function fetchActivities(
  { from, to, producer }: { from: string; to: string; producer: string | null },
  signal?: AbortSignal,
): Promise<AgriculturalActivity[]> {
  const params = new URLSearchParams({ from, to });
  if (producer) params.set('producer', producer);
  const { results } = await apiFetch<Schemas['ActivityList']>(
    `/api/agricultural-activities?${params}`,
    { signal },
  );
  return results;
}

// Las actividades programadas en un mes (yyyy-MM), con copia en el dispositivo.
export const useActivitiesOfMonth = (
  userId: string | undefined,
  month: string,
  producer: string | null,
) =>
  useQuery({
    queryKey: queryKeys.agriculturalActivities.month(producer, month),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, activityMonthCacheKey(producer, month), () =>
        fetchActivities({ ...monthBounds(month), producer }, signal),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
  });

export const fetchActivity = (id: string, signal?: AbortSignal) =>
  apiFetch<AgriculturalActivity>(`/api/agricultural-activities/${id}`, {
    signal,
  });

// Sin respuesta del servidor (sin red) la actividad sale de los meses guardados, con la fecha de
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

// Una actividad sola: la que se va a registrar como realizada, también sin conexión.
export const useActivity = (userId: string | undefined, id: string) =>
  useQuery({
    queryKey: queryKeys.agriculturalActivities.detail(id),
    queryFn: ({ signal }) => readActivity(userId!, id, signal),
    enabled: !!userId && !!id,
    networkMode: 'offlineFirst',
  });

export async function fetchActivityAssignees(
  { producer }: { producer: string | null },
  signal?: AbortSignal,
): Promise<Assignee[]> {
  const suffix = producer ? `?${new URLSearchParams({ producer })}` : '';
  const { results } = await apiFetch<Schemas['AssigneeList']>(
    `/api/agricultural-activities/assignees${suffix}`,
    { signal },
  );
  return results;
}

// Las cuentas del productor, activas e inactivas: las inactivas siguen apareciendo en sus
// actividades, pero el formulario solo ofrece las activas. Con copia en el dispositivo.
export const useActivityAssignees = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.agriculturalActivities.assignees(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, assigneesCacheKey(producer), () =>
        fetchActivityAssignees({ producer }, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

export const postActivity = (body: ActivityCreateRequest) =>
  apiFetch<AgriculturalActivity>('/api/agricultural-activities', {
    method: 'POST',
    body,
  });

function useInvalidateActivities() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agriculturalActivities.all(),
    });
}

// Programar es solo en línea: sin red debe fallar en el acto con un aviso, y no quedar en pausa
// para ejecutarse sola al volver la red, cuando ya nadie lo está pidiendo. La lectura que sigue a
// la invalidación rehace la copia del mes en el dispositivo.
export function useCreateActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    networkMode: 'always',
    mutationFn: postActivity,
    onSuccess: () => invalidate(),
  });
}
