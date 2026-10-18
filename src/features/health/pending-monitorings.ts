import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
export type PendingMonitoring = Schemas['AgriculturalActivity'];

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const pendingMonitoringsCacheKey = (producer: string | null) =>
  producer ? `pending-monitorings:producer:${producer}` : 'pending-monitorings';

async function fetchPendingMonitorings(
  through: string,
  producer: string | null,
  signal?: AbortSignal,
): Promise<PendingMonitoring[]> {
  const params = new URLSearchParams({
    through,
    activity_type: 'phytosanitary_monitoring',
  });
  if (producer) params.set('producer', producer);
  const { results } = await apiFetch<Schemas['ActivityList']>(
    `/api/agricultural-activities/pending?${params}`,
    { signal },
  );
  return results;
}

// Los monitoreos que siguen sin registrar hasta `through` (hoy): los de hoy y los retrasados o
// vencidos, por viejo que sea el atraso. Con copia en el dispositivo, como el calendario.
export const usePendingMonitorings = (
  userId: string | undefined,
  through: string,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.health.pendingMonitorings(producer, through),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, pendingMonitoringsCacheKey(producer), () =>
        fetchPendingMonitorings(through, producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
