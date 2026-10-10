'use client';

import type { ActivityOfDay } from '../activity-days';
import type { UsedInput } from '../api';
import { ActivityDetailDialog } from './activity-detail-dialog';
import { ActivityFormDialog } from './activity-form-dialog';

// El diálogo abierto sobre la lista. De una actividad se guarda solo el id: el detalle la muestra
// como está en la lista, también después de que una acción la cambie.
export type PendingDialog =
  | { kind: 'schedule' }
  | { kind: 'detail'; id: string }
  | { kind: 'edit'; id: string };

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
  formatUsedInput,
  onPending,
  onNotice,
}: {
  pending: PendingDialog | undefined;
  // Las actividades de la lista, con su estado de hoy.
  items: readonly ActivityOfDay[];
  today: string;
  // Sin conexión solo se consulta: editar necesita al servidor.
  offline: boolean;
  formatUsedInput: (used: UsedInput) => string;
  onPending: (pending: PendingDialog | undefined) => void;
  onNotice: (notice: ActivityNotice) => void;
}) {
  const close = () => onPending(undefined);
  const saved = (message: string, isoDate: string) => {
    close();
    onNotice({ message, variant: 'success', month: monthOf(isoDate) });
  };

  if (!pending) return null;
  if (pending.kind === 'schedule') {
    return (
      <ActivityFormDialog
        onClose={close}
        onRejected={close}
        onSaved={(activity, message) => saved(message, activity.scheduled_date)}
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
        onRejected={(message) => {
          close();
          onNotice({ message, variant: 'error' });
        }}
        onSaved={(activity, message) => saved(message, activity.scheduled_date)}
      />
    );
  }

  return (
    <ActivityDetailDialog
      formatUsedInput={formatUsedInput}
      item={item}
      offline={offline}
      onClose={close}
      onEdit={() => onPending({ kind: 'edit', id })}
      today={today}
    />
  );
}
