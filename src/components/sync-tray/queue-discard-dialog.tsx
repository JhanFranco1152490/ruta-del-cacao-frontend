'use client';

import { Trash2 } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { notify } from '@/lib/notify';
import {
  QueueItemBusyError,
  QueueItemHasDependentsError,
  QueueItemMissingError,
} from '@/lib/offline/sync-queue';

export function queueDiscardErrorMessage(error: unknown) {
  if (error instanceof QueueItemBusyError) {
    return 'El registro se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Este registro ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  if (error instanceof QueueItemHasDependentsError) {
    return 'Otros registros de este dispositivo dependen de este. Descártalos primero desde la bandeja.';
  }
  return 'No fue posible descartar el registro. Inténtalo nuevamente.';
}

// Descartar un registro que el servidor rechazó: se borra del dispositivo y no se envía. Uno que
// espera conexión no lo ofrece, porque todavía puede llegar bien.
export function QueueDiscardDialog({
  title,
  description,
  successMessage,
  onDiscard,
}: {
  title: string;
  // Qué pasa con lo que ya existe en el servidor.
  description: string;
  successMessage: string;
  onDiscard: () => Promise<void>;
}) {
  const dialog = useConfirmAction(async () => {
    await onDiscard();
    notify.success(successMessage);
  }, queueDiscardErrorMessage);
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title,
    description,
    confirm: 'Descartar registro',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
