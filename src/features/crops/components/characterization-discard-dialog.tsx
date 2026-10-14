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

import { useDiscardCharacterization } from '../use-characterization-queue';

function discardErrorMessage(error: unknown) {
  if (error instanceof QueueItemBusyError) {
    return 'La caracterización se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Esta caracterización ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  return 'No fue posible descartar la caracterización. Inténtalo nuevamente.';
}

// Solo para una ficha que falló al sincronizar: una pendiente todavía puede llegar bien.
export function CharacterizationDiscardDialog({
  plotId,
  code,
}: {
  plotId: string;
  code: string;
}) {
  const discard = useDiscardCharacterization();
  const dialog = useConfirmAction(async () => {
    await discard.mutateAsync(plotId);
    notify.success('Ficha pendiente descartada');
  }, discardErrorMessage);
  const action: StatusChangeAction = {
    trigger: 'Descartar caracterización',
    title: `¿Descartar la caracterización de ${code}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. Si la parcela ya tenía una caracterización guardada, esa se conserva.',
    confirm: 'Descartar caracterización',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
