import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { usePendingMonitorings } from './pending-monitorings';
import { useUpcomingMonitorings } from './upcoming-monitorings';
import { useWaitingDetections } from './waiting-detections';

type Place = { farm: string | null; plot: string | null };

const inPlace = (
  item: { plot: { id: string; farm: { id: string } } },
  { farm, plot }: Place,
) => (!farm || item.plot.farm.id === farm) && (!plot || item.plot.id === plot);

// Lo que hay por hacer en Sanidad, filtrado por la finca y la parcela elegidas: los monitoreos por
// registrar (hoy y retrasados), las detecciones que esperan un control y los monitoreos que
// vienen. Cada lista se pide solo si la cuenta puede hacer algo con ella. `actionable` cuenta lo
// que le toca a quien mira: lo que viene no cuenta, todavía no se puede registrar.
export function usePendingItems(producer: string | null, place: Place) {
  const { data: user } = useSession();
  const today = todayInBogota();
  const canRecord = hasPermission(user, PERMISSIONS.ACTIVITIES_COMPLETE);
  const canSchedule = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const canView = hasPermission(user, PERMISSIONS.ACTIVITIES_VIEW);
  const pending = usePendingMonitorings(user?.id, today, producer, {
    enabled: canRecord,
  });
  const waiting = useWaitingDetections(user?.id, producer, {
    enabled: canSchedule,
  });
  const upcoming = useUpcomingMonitorings(user?.id, today, producer, {
    enabled: canView,
  });

  const toRecord = (pending.data?.data ?? []).filter((activity) =>
    inPlace(activity, place),
  );
  const waitingControls = waiting.detections.filter((detection) =>
    inPlace(detection, place),
  );
  const coming = (upcoming.data?.data ?? []).filter((activity) =>
    inPlace(activity, place),
  );
  const loaded =
    (!canRecord || !pending.isPending || pending.fetchStatus === 'paused') &&
    (!canSchedule || waiting.isSettled);

  return {
    toRecord: canRecord ? toRecord : [],
    waitingControls: canSchedule ? waitingControls : [],
    coming: canView ? coming : [],
    actionable:
      (canRecord ? toRecord.length : 0) +
      (canSchedule ? waitingControls.length : 0),
    // Ya se sabe qué le toca a quien mira (una cuenta de solo consulta no espera nada).
    isLoaded: loaded,
    today,
  };
}
