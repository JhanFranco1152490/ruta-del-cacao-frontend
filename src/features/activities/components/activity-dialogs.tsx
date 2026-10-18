'use client';

import type { ReactNode } from 'react';

import { notify } from '@/lib/notify';

import type { ActivityOfDay } from '../activity-days';
import type { AgriculturalActivity } from '../api';
import { activityCompletionPath } from '../activity-paths';
import type { ActivityType } from '../activity-state';
import { ActivityDayDialog } from './activity-day-dialog';
import { ActivityDeleteDialog } from './activity-delete-dialog';
import { ActivityDetailDialog } from './activity-detail-dialog';
import { ActivityFormDialog } from './activity-form-dialog';

// El diálogo abierto sobre la lista. De una actividad se guarda solo el id: el detalle la muestra
// como está en la lista, también después de que una acción la cambie.
export type PendingDialog =
  // Programar, con lo que ya se sabe cuando se hace desde un día o una parcela del calendario.
  | {
      kind: 'schedule';
      date?: string;
      farmId?: string;
      plotId?: string;
      // Un monitoreo se programa con su botón: el formulario lo trae elegido.
      activityType?: ActivityType;
    }
  // Todas las de un día (de una parcela, si viene `plotId`) cuando la celda no las muestra todas.
  | { kind: 'day'; date: string; plotId?: string }
  | { kind: 'detail'; id: string }
  | { kind: 'edit'; id: string }
  | { kind: 'delete'; id: string };

const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function ActivityDialogs({
  pending,
  items,
  today,
  offline,
  currentMonth,
  onGoToMonth,
  onPending,
  monitoringHref,
  renderDetails,
}: {
  pending: PendingDialog | undefined;
  // Las actividades que se ven, con su estado de hoy.
  items: readonly ActivityOfDay[];
  today: string;
  // Sin conexión solo se consulta: editar y eliminar necesitan al servidor.
  offline: boolean;
  // El mes que se ve. Si la actividad queda en otro, el aviso ofrece ir a verla: la vista no salta.
  currentMonth: string;
  // Solo en la vista de mes; en las demás no hay a dónde ir.
  onGoToMonth?: (month: string) => void;
  onPending: (pending: PendingDialog | undefined) => void;
  // La pantalla donde se registra el resultado de un monitoreo, si la página la entrega.
  monitoringHref?: (activityId: string) => string;
  // Lo que otro dominio agrega al detalle. `openActivity` abre el detalle de otra actividad de la
  // lista (el monitoreo que atiende un control).
  renderDetails?: (
    activity: AgriculturalActivity,
    context: { openActivity: (activityId: string) => void },
  ) => ReactNode;
}) {
  const close = () => onPending(undefined);
  const saved = (message: string, isoDate: string) => {
    close();
    const month = monthOf(isoDate);
    notify.success(
      message,
      onGoToMonth && month !== currentMonth
        ? {
            action: {
              label: 'Ver en su mes',
              onClick: () => onGoToMonth(month),
            },
          }
        : undefined,
    );
  };

  const rejected = (message: string) => {
    close();
    notify.error(message);
  };

  if (!pending) return null;
  if (pending.kind === 'schedule') {
    return (
      <ActivityFormDialog
        onClose={close}
        onRejected={close}
        preset={{
          date: pending.date,
          farmId: pending.farmId,
          plotId: pending.plotId,
          activityType: pending.activityType,
        }}
        onSaved={(activity, message) => saved(message, activity.scheduled_date)}
      />
    );
  }

  if (pending.kind === 'day') {
    const ofDay = items.filter(
      ({ activity }) =>
        activity.scheduled_date === pending.date &&
        (!pending.plotId || activity.plot.id === pending.plotId),
    );
    if (ofDay.length === 0) return null;
    return (
      <ActivityDayDialog
        date={pending.date}
        items={ofDay}
        onClose={close}
        onSelect={({ activity }) =>
          onPending({ kind: 'detail', id: activity.id })
        }
      />
    );
  }

  // La actividad dejó de estar en la lista (se cambió de mes, o ya no existe): no hay qué mostrar.
  const item = items.find(({ activity }) => activity.id === pending.id);
  if (!item) return null;
  const { id } = pending;

  if (pending.kind === 'edit') {
    return (
      <ActivityFormDialog
        activity={item.activity}
        // Cancelar vuelve al detalle del que salió.
        onClose={() => onPending({ kind: 'detail', id })}
        onRejected={rejected}
        onSaved={(activity, message) => saved(message, activity.scheduled_date)}
      />
    );
  }

  if (pending.kind === 'delete') {
    return (
      <ActivityDeleteDialog
        activity={item.activity}
        // Cancelar vuelve al detalle del que salió.
        onClose={() => onPending({ kind: 'detail', id })}
        onDone={(message) => {
          close();
          notify.success(message);
        }}
        onRejected={rejected}
      />
    );
  }

  return (
    <ActivityDetailDialog
      completeHref={activityCompletionPath(id)}
      item={item}
      monitoringHref={monitoringHref?.(id)}
      renderDetails={
        renderDetails &&
        ((activity) =>
          renderDetails(activity, {
            openActivity: (other) => onPending({ kind: 'detail', id: other }),
          }))
      }
      offline={offline}
      onClose={close}
      onDelete={() => onPending({ kind: 'delete', id })}
      onEdit={() => onPending({ kind: 'edit', id })}
      today={today}
    />
  );
}
