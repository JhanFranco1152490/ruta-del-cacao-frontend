import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { shiftDays } from '@/lib/format/dates';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
export type UpcomingMonitoring = Schemas['AgriculturalActivity'];

// El listado de actividades acepta hasta 120 días por petición.
const WINDOW_DAYS = 120;

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const upcomingMonitoringsCacheKey = (producer: string | null) =>
  producer
    ? `upcoming-monitorings:producer:${producer}`
    : 'upcoming-monitorings';

async function fetchUpcomingMonitorings(
  from: string,
  producer: string | null,
  signal?: AbortSignal,
): Promise<UpcomingMonitoring[]> {
  const params = new URLSearchParams({
    from,
    to: shiftDays(from, WINDOW_DAYS - 1),
  });
  if (producer) params.set('producer', producer);
  const { results } = await apiFetch<Schemas['ActivityList']>(
    `/api/agricultural-activities?${params}`,
    { signal },
  );
  return results
    .filter(
      (activity) =>
        activity.activity_type === 'phytosanitary_monitoring' &&
        activity.status === 'scheduled',
    )
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}

// Los monitoreos programados desde mañana, los próximos 120 días, del más cercano al más lejano.
// Salen del listado del calendario: no hay una consulta propia de monitoreos con fecha futura, y los
// de hoy y los retrasados son «por registrar» (`usePendingMonitorings`). Con copia en el
// dispositivo. Siempre se vuelve a pedir al abrir la pantalla: quien acaba de programar uno desde
// el calendario espera verlo aquí.
export const useUpcomingMonitorings = (
  userId: string | undefined,
  today: string,
  producer: string | null,
  { enabled = true } = {},
) => {
  const from = shiftDays(today, 1);
  return useQuery({
    queryKey: queryKeys.health.upcomingMonitorings(producer, from),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, upcomingMonitoringsCacheKey(producer), () =>
        fetchUpcomingMonitorings(from, producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    staleTime: 0,
  });
};
