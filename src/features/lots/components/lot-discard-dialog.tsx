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
  QueueItemMissingError,
} from '@/lib/offline/sync-queue';

import { useDiscardLot } from '../use-lot-queue';

function discardErrorMessage(error: unknown) {
  if (error instanceof QueueItemBusyError) {
    return 'El registro se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Este registro ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  return 'No fue posible descartar el registro. Inténtalo nuevamente.';
}

// Solo para un lote que el servidor rechazó: uno pendiente todavía puede llegar bien.
export function LotDiscardDialog({
  lotId,
  label,
}: {
  lotId: string;
  // Cómo se nombra el lote en la bandeja.
  label: string;
}) {
  const discard = useDiscardLot();
  const dialog = useConfirmAction(async () => {
    await discard.mutateAsync(lotId);
    notify.success('Lote pendiente descartado');
  }, discardErrorMessage);
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar el ${label.toLowerCase()}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. La cosecha seguirá sin lote: podrás conformarlo de nuevo.',
    confirm: 'Descartar registro',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
