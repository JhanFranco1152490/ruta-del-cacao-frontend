import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components, operations } from '@/lib/api/schema';
import { monthBounds, shiftDays, todayInBogota } from '@/lib/format/dates';
import { readThroughCache } from '@/lib/offline/cached-read';

import { PENDING_FETCH_DAYS } from './activity-pending';
import {
  activityMonthCacheKey,
  assigneesCacheKey,
  offlineWindowMonths,
  pendingCacheKey,
} from './activity-cache';

type Schemas = components['schemas'];
export type AgriculturalActivity = Schemas['AgriculturalActivity'];
export type Assignee = Schemas['Assignee'];
// Una cuenta de la lista de responsables: con la finca en la que trabaja (nula en el Productor,
// que vale para todas) y si quien pregunta puede asignarle una labor.
export type AssigneeOption = Schemas['AssigneeOption'];
export type UsedInput = Schemas['UsedInputOutput'];
export type ActivityCreateRequest = Schemas['ActivityCreateRequest'];
export type ActivityUpdateRequest = Schemas['PatchedActivityUpdateRequest'];
export type CompletionRequest = Schemas['CompletionRequest'];
type ActivityDeleteQuery =
  operations['agricultural_activities_destroy']['parameters']['query'];

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

const windowsInFlight = new Map<string, Promise<void>>();

// Guarda la copia de los meses de la ventana sin conexión, menos el que se está viendo (que se
// acaba de guardar), y la de lo pendiente. Un mes por petición: cuatro meses pueden pasar de los 120 días que acepta la
// consulta. Corre una sola vez a la vez por persona y productor, aunque varias lecturas la pidan,
// y un mes que falla no impide guardar los demás.
function saveOfflineWindow(
  userId: string,
  producer: string | null,
  viewedMonth: string,
): Promise<void> {
  const key = `${userId}:${producer ?? ''}`;
  const running = windowsInFlight.get(key);
  if (running) return running;
  const today = todayInBogota();
  const months = offlineWindowMonths(today).filter(
    (month) => month !== viewedMonth,
  );
  const saving = Promise.allSettled([
    ...months.map((month) =>
      readThroughCache(userId, activityMonthCacheKey(producer, month), () =>
        fetchActivities({ ...monthBounds(month), producer }),
      ),
    ),
    // También lo pendiente: quien sale sin señal lleva lo vencido y lo retrasado, aunque nunca
    // haya abierto esa vista.
    readThroughCache(userId, pendingCacheKey(producer), () =>
      fetchPendingActivities({ through: pendingLimit(today), producer }),
    ),
  ])
    .then(() => undefined)
    .finally(() => windowsInFlight.delete(key));
  windowsInFlight.set(key, saving);
  return saving;
}

// La consulta de las actividades programadas en un mes (yyyy-MM), con copia en el dispositivo.
// Cada vez que la lectura llega del servidor, además se renueva la copia de la ventana sin
// conexión. La comparten la lectura de un mes y la de un rango de meses.
export const activityMonthQuery = (
  userId: string | undefined,
  month: string,
  producer: string | null,
) =>
  queryOptions({
    queryKey: queryKeys.agriculturalActivities.month(producer, month),
    queryFn: async ({ signal }) => {
      const read = await readThroughCache(
        userId!,
        activityMonthCacheKey(producer, month),
        () => fetchActivities({ ...monthBounds(month), producer }, signal),
      );
      // Sin `savedAt` la lectura llegó del servidor: hay red para guardar el resto. No se espera,
      // para que el calendario aparezca con su mes.
      if (read.savedAt === undefined) {
        void saveOfflineWindow(userId!, producer, month);
      }
      return read;
    },
    enabled: !!userId,
    networkMode: 'offlineFirst',
  });

export const useActivitiesOfMonth = (
  userId: string | undefined,
  month: string,
  producer: string | null,
) => useQuery(activityMonthQuery(userId, month, producer));

// Hasta qué fecha se piden las pendientes: hoy más el máximo de días que se puede mostrar. La
// vista recorta a los días que la persona eligió.
const pendingLimit = (today: string) => shiftDays(today, PENDING_FETCH_DAYS);

// Lo que sigue sin realizar hasta la fecha dada, por viejo que sea el atraso: el listado por
// periodo se limita a 120 días y una vencida de hace meses seguiría pendiente.
export async function fetchPendingActivities(
  { through, producer }: { through: string; producer: string | null },
  signal?: AbortSignal,
): Promise<AgriculturalActivity[]> {
  const params = new URLSearchParams({ through });
  if (producer) params.set('producer', producer);
  const { results } = await apiFetch<Schemas['ActivityList']>(
    `/api/agricultural-activities/pending?${params}`,
    { signal },
  );
  return results;
}

// Las pendientes hasta 90 días después de `today` (yyyy-MM-dd), con copia en el dispositivo.
export const usePendingActivities = (
  userId: string | undefined,
  today: string,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.agriculturalActivities.pending(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, pendingCacheKey(producer), () =>
        fetchPendingActivities(
          { through: pendingLimit(today), producer },
          signal,
        ),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

export async function fetchActivityAssignees(
  { producer }: { producer: string | null },
  signal?: AbortSignal,
): Promise<AssigneeOption[]> {
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

export const patchActivity = (id: string, body: ActivityUpdateRequest) =>
  apiFetch<AgriculturalActivity>(`/api/agricultural-activities/${id}`, {
    method: 'PATCH',
    body,
  });

// La actividad como está ahora en el servidor, cuando otra persona la cambió primero.
export function currentActivityOf(error: unknown): AgriculturalActivity | null {
  if (!isApiError(error) || error.code !== ACTIVITY_ERROR.staleVersion) {
    return null;
  }
  return (error.body.current as AgriculturalActivity | undefined) ?? null;
}

// También al fallar: con una versión obsoleta, o si la actividad ya se realizó o venció, la lista
// debe leer cómo quedó.
export function useUpdateActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, body }: { id: string; body: ActivityUpdateRequest }) =>
      patchActivity(id, body),
    onSettled: () => invalidate(),
  });
}

// La versión leída va en la URL: un DELETE con cuerpo no tiene significado definido en HTTP.
export const deleteActivity = (id: string, expectedVersion: number) => {
  const query: ActivityDeleteQuery = { expected_version: expectedVersion };
  const params = new URLSearchParams({
    expected_version: String(query.expected_version),
  });
  return apiFetch<void>(`/api/agricultural-activities/${id}?${params}`, {
    method: 'DELETE',
  });
};

// También al fallar: la lista debe leer cómo quedó la actividad que no se pudo eliminar.
export function useDeleteActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => deleteActivity(id, expectedVersion),
    onSettled: () => invalidate(),
  });
}

// La envía la cola del dispositivo, no una pantalla: la realización se guarda primero en el
// teléfono y puede llegar horas después. El mismo envío repetido responde igual y no cambia nada.
export const postCompletion = (id: string, body: CompletionRequest) =>
  apiFetch<AgriculturalActivity>(
    `/api/agricultural-activities/${id}/completion`,
    { method: 'POST', body },
  );
