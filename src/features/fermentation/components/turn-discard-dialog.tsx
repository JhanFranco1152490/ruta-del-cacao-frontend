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

import { useDiscardTurn } from '../use-turn-queue';

function discardErrorMessage(error: unknown) {
  if (error instanceof QueueItemBusyError) {
    return 'El registro se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Este registro ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  return 'No fue posible descartar el registro. Inténtalo nuevamente.';
}

// Solo para un volteo que el servidor rechazó: uno pendiente todavía puede llegar bien.
export function TurnDiscardDialog({
  turnId,
  label,
}: {
  turnId: string;
  // Cómo se nombra el volteo: «000123-F02-P05-261014-1 · volteo 3 · 17 oct. 08:00».
  label: string;
}) {
  const discard = useDiscardTurn();
  const dialog = useConfirmAction(async () => {
    await discard.mutateAsync(turnId);
    notify.success('Volteo pendiente descartado');
  }, discardErrorMessage);
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar el volteo ${label}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. Si el volteo sí se hizo y la fermentación sigue, tendrás que registrarlo de nuevo.',
    confirm: 'Descartar registro',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
