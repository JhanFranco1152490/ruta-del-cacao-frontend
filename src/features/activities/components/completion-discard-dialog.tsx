'use client';

import { Trash2 } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import {
  QueueItemBusyError,
  QueueItemMissingError,
} from '@/lib/offline/sync-queue';
import { notify } from '@/lib/notify';

import { useDiscardCompletion } from '../use-completion-queue';

function discardErrorMessage(error: unknown) {
  if (error instanceof QueueItemBusyError) {
    return 'El registro se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Este registro ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  return 'No fue posible descartar el registro. Inténtalo nuevamente.';
}

// Solo para una realización que el servidor rechazó: una pendiente todavía puede llegar bien.
export function CompletionDiscardDialog({
  activityId,
  label,
}: {
  activityId: string;
  // Cómo se nombra la labor: "Fertilización · P-03".
  label: string;
}) {
  const discard = useDiscardCompletion();
  const dialog = useConfirmAction(async () => {
    await discard.mutateAsync(activityId);
    notify.success('Realización pendiente descartada');
  }, discardErrorMessage);
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar la realización de ${label}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. La actividad queda como estaba.',
    confirm: 'Descartar registro',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
