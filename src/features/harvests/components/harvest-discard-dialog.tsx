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

import { useDiscardHarvest } from '../use-harvest-queue';

function discardErrorMessage(error: unknown) {
  if (error instanceof QueueItemBusyError) {
    return 'El registro se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Este registro ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  return 'No fue posible descartar el registro. Inténtalo nuevamente.';
}

// Solo para una cosecha que el servidor rechazó: una pendiente todavía puede llegar bien.
export function HarvestDiscardDialog({
  harvestId,
  label,
}: {
  harvestId: string;
  // Cómo se nombra la cosecha: "P05 · Lote del río · 14 oct.".
  label: string;
}) {
  const discard = useDiscardHarvest();
  const dialog = useConfirmAction(async () => {
    await discard.mutateAsync(harvestId);
    notify.success('Cosecha pendiente descartada');
  }, discardErrorMessage);
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar la cosecha ${label}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. Si la recolección sí ocurrió, tendrás que registrarla de nuevo.',
    confirm: 'Descartar registro',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog action={action} trigger={action} {...dialog} />;
}
