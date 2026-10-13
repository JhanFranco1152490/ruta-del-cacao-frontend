'use client';

import type { ActivityOfDay } from '../activity-days';
import { activityCompletionPath } from '../activity-paths';
import { ActivityDayDialog } from './activity-day-dialog';
import { ActivityDeleteDialog } from './activity-delete-dialog';
import { ActivityDetailDialog } from './activity-detail-dialog';
import { ActivityFormDialog } from './activity-form-dialog';

// El diálogo abierto sobre la lista. De una actividad se guarda solo el id: el detalle la muestra
// como está en la lista, también después de que una acción la cambie.
export type PendingDialog =
  // Programar, con lo que ya se sabe cuando se hace desde un día o una parcela del calendario.
  | { kind: 'schedule'; date?: string; farmId?: string; plotId?: string }
  // Todas las de un día (de una parcela, si viene `plotId`) cuando la celda no las muestra todas.
  | { kind: 'day'; date: string; plotId?: string }
  | { kind: 'detail'; id: string }
  | { kind: 'edit'; id: string }
  | { kind: 'delete'; id: string };

export type ActivityNotice = {
  message: string;
  variant: 'success' | 'error';
  // El mes (yyyy-MM) en que quedó la actividad, para ofrecer ir a verla si es otro.
  month?: string;
};

const monthOf = (isoDate: string) => isoDate.slice(0, 7);

export function ActivityDialogs({
  pending,
  items,
  today,
  offline,
  onPending,
  onNotice,
}: {
  pending: PendingDialog | undefined;
  // Las actividades que se ven, con su estado de hoy.
  items: readonly ActivityOfDay[];
  today: string;
  // Sin conexión solo se consulta: editar y eliminar necesitan al servidor.
  offline: boolean;
  onPending: (pending: PendingDialog | undefined) => void;
  onNotice: (notice: ActivityNotice) => void;
}) {
  const close = () => onPending(undefined);
  const saved = (message: string, isoDate: string) => {
    close();
    onNotice({ message, variant: 'success', month: monthOf(isoDate) });
  };

  const rejected = (message: string) => {
    close();
    onNotice({ message, variant: 'error' });
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
          onNotice({ message, variant: 'success' });
        }}
        onRejected={rejected}
      />
    );
  }

  return (
    <ActivityDetailDialog
      completeHref={activityCompletionPath(id)}
      item={item}
      offline={offline}
      onClose={close}
      onDelete={() => onPending({ kind: 'delete', id })}
      onEdit={() => onPending({ kind: 'edit', id })}
      today={today}
    />
  );
}
