import { useQuery } from '@tanstack/react-query';

import { readThroughCache } from '@/lib/offline/cached-read';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];
// Una cuenta de la lista de responsables: con las fincas en las que trabaja (o todas, como el
// Productor) y si quien pregunta puede asignarle una labor.
export type AssigneeOption = Schemas['AssigneeOption'];

// La cuenta técnica guarda aparte las cuentas de cada productor que eligió.
export const assigneesCacheKey = (producer: string | null) =>
  producer
    ? `agricultural-activity-assignees:producer:${producer}`
    : 'agricultural-activity-assignees';

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
// actividades, pero los formularios solo ofrecen las activas. Las usan programar una labor y
// programar un control. Con copia en el dispositivo.
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
