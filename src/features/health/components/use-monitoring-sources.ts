'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useActivityAssignees } from '@/lib/api/activity-assignees';
import { useActivity } from '@/lib/api/activity-read';
import { isApiError } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useUsableInputs } from '@/lib/api/usable-inputs';
import { assignableIn } from '@/lib/assignable-accounts';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { QueuedMonitoring } from '../monitoring-queue';
import { type PestDisease, useActivePestsDiseases } from '../pest-api';
import { useQueuedMonitoring } from '../use-monitoring-queue';
import type { ControlChoices } from './control-choices';

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
  const farmId = found?.plot.farm.id ?? null;
  // La cuenta técnica lee lo del productor del monitoreo; las demás cuentas, lo suyo.
  const superuser = user?.is_superuser === true;
  const producerId = found?.producer_id ?? null;
  const canSchedule = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const inputs = useUsableInputs(user, {
    farmId,
    producerId,
    enabled: !!found,
  });
  // Solo quien puede programar elige responsable.
  const accounts = useActivityAssignees(
    user?.id,
    superuser ? producerId : null,
    { enabled: canSchedule && !!found && (!superuser || !!producerId) },
  );
  const assignees = useMemo(
    () =>
      farmId
        ? assignableIn(accounts.data?.data ?? [], farmId).map(
            ({ id, full_name }) => ({
              id,
              label: id === user?.id ? `${full_name} (tú)` : full_name,
            }),
          )
        : [],
    [accounts.data, farmId, user?.id],
  );

  if (isPausedWithoutData(activity) || activity.isError) {
    return isApiError(activity.error) && activity.error.status === 404
      ? { status: 'missing' }
      : { status: 'unreachable' };
  }
  const waiting =
    activity.isPending ||
    queued.isPending ||
    (pests.isPending && !isPausedWithoutData(pests)) ||
    inputs.isPending;
  if (waiting || !found) return { status: 'loading' };

  return {
    status: 'ready',
    activity: found,
    queued: queued.data ?? undefined,
    pests: pests.data?.data,
    choices: {
      canSchedule,
      catalog: inputs.catalog,
      stocks: inputs.stocks,
      assignees,
    },
  };
}
