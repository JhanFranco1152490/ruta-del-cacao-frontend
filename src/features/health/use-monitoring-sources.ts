'use client';

import { useSession } from '@/hooks/use-session';
import { useActivity } from '@/lib/api/activity-read';
import { isApiError } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import type { QueuedMonitoring } from './monitoring-queue';
import { type PestDisease, useActivePestsDiseases } from './pest-api';
import { useQueuedMonitoring } from './use-monitoring-queue';
import type { ControlChoices } from './control-choices';
import { useControlChoicesSource } from './use-control-choices-source';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

export type MonitoringSources =
  // El monitoreo ya no existe en el servidor.
  | { status: 'missing' }
  // Sin red y sin copia del monitoreo en el dispositivo.
  | { status: 'unreachable' }
  | { status: 'loading' }
  | {
      status: 'ready';
      activity: AgriculturalActivity;
      // El resultado de este monitoreo que sigue en el dispositivo, si hay uno.
      queued: QueuedMonitoring | undefined;
      // Las plagas y enfermedades activas, o `undefined` si el catálogo nunca se cargó en este
      // dispositivo: entonces solo se puede elegir Otra.
      pests: readonly PestDisease[] | undefined;
      // Lo que ofrece el control de cada detección.
      choices: Omit<ControlChoices, 'today'>;
    };

// Todo lo que la planilla lee antes de mostrar algo: el monitoreo, lo que ya haya de él en la cola
// y el catálogo de plagas. Cada lectura cae a su copia del dispositivo cuando no hay red.
export function useMonitoringSources(activityId: string): MonitoringSources {
  const { data: user } = useSession();
  const activity = useActivity(user?.id, activityId);
  const queued = useQueuedMonitoring(activityId);
  const pests = useActivePestsDiseases(user?.id);
  const found = activity.data?.data;
  const control = useControlChoicesSource({
    farmId: found?.plot.farm.id ?? null,
    producerId: found?.producer_id ?? null,
    enabled: !!found,
  });

  if (isPausedWithoutData(activity) || activity.isError) {
    return isApiError(activity.error) && activity.error.status === 404
      ? { status: 'missing' }
      : { status: 'unreachable' };
  }
  const waiting =
    activity.isPending ||
    queued.isPending ||
    (pests.isPending && !isPausedWithoutData(pests)) ||
    control.isPending;
  if (waiting || !found) return { status: 'loading' };

  return {
    status: 'ready',
    activity: found,
    queued: queued.data ?? undefined,
    pests: pests.data?.data,
    choices: control.choices,
  };
}
