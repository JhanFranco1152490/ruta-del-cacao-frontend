'use client';

import { useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { PendingDialog } from './activity-dialog-state';
import { type ScheduleLink, useScheduleLink } from './use-schedule-link';

// Programar desde el calendario: el botón (o el botón flotante en celular), un día de la vista y el
// enlace que llega de otra pantalla (`?programar=`). Todo pide el permiso de programar; programar
// sobre un día pide además conexión.
export function useCalendarScheduling({
  ready,
  offline,
  hasConnection,
  open,
}: {
  // La sesión y el periodo ya cargaron: antes no hay dónde mostrar el aviso de un enlace.
  ready: boolean;
  offline: boolean;
  hasConnection: boolean;
  open: (dialog: PendingDialog) => void;
}) {
  const { data: user } = useSession();
  const canSchedule = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const [linkedSchedule, setLinkedSchedule] = useState<ScheduleLink | null>(
    null,
  );
  useScheduleLink({
    ready: !!user && ready,
    canSchedule,
    offline: !hasConnection,
    onOpen: setLinkedSchedule,
  });
  return {
    canSchedule,
    linkedSchedule,
    closeLinkedSchedule: () => setLinkedSchedule(null),
    openScheduleForm: () => open({ kind: 'schedule' }),
    openMonitoringForm: () =>
      open({ kind: 'schedule', activityType: 'phytosanitary_monitoring' }),
    scheduleOnDay:
      canSchedule && !offline
        ? (date: string, farmId?: string, plotId?: string) =>
            open({ kind: 'schedule', date, farmId, plotId })
        : undefined,
  };
}
