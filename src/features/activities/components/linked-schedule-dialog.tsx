'use client';

import { useRouter } from 'next/navigation';

import { notify } from '@/lib/notify';

import { type ScheduleLink } from '../use-schedule-link';
import { ActivityFormDialog } from './activity-form-dialog';

// El formulario de programar un monitoreo que pidió otra pantalla. Al guardar o cancelar vuelve a
// ella (con sus filtros): quien programa desde Sanidad sigue en Sanidad. Sin una pantalla de origen
// se queda en el calendario, y al guardar ofrece ir al mes de la actividad. Va aparte del resto de
// diálogos del calendario porque solo este necesita el enrutador.
export function LinkedScheduleDialog({
  link,
  currentMonth,
  onGoToMonth,
  onClose,
}: {
  link: ScheduleLink;
  currentMonth: string;
  onGoToMonth: (month: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const leave = () => {
    onClose();
    if (link.origin) router.replace(link.origin);
  };

  return (
    <ActivityFormDialog
      onClose={leave}
      onRejected={(message) => {
        leave();
        notify.error(message);
      }}
      onSaved={(activity, message) => {
        onClose();
        const month = activity.scheduled_date.slice(0, 7);
        if (link.origin) {
          router.replace(link.origin);
          notify.success(message, {
            action: {
              label: 'Ver en el calendario',
              onClick: () => router.push(`/actividades?mes=${month}`),
            },
          });
        } else {
          notify.success(
            message,
            month !== currentMonth
              ? {
                  action: {
                    label: 'Ver en su mes',
                    onClick: () => onGoToMonth(month),
                  },
                }
              : undefined,
          );
        }
      }}
      preset={{
        farmId: link.farmId,
        plotId: link.plotId,
        activityType: 'phytosanitary_monitoring',
      }}
    />
  );
}
