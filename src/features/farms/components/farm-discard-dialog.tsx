'use client';

import { Trash2 } from 'lucide-react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';

import type { FarmListItem } from '../farm-list-item';
import { queueErrorMessage } from '../queue-error-message';
import {
  type ConfirmControl,
  useConfirmAction,
} from '@/hooks/use-confirm-action';
import { notify } from '@/lib/notify';
import { useFarmDiscard } from '../use-farm-queue';

export function FarmDiscardDialog({
  farm,
  control,
}: {
  farm: FarmListItem;
  // Abierto desde un menú de acciones: sin botón propio.
  control?: ConfirmControl;
}) {
  const discard = useFarmDiscard();
  const dialog = useConfirmAction(
    async () => {
      await discard.mutateAsync(farm.id);
      notify.success('Finca pendiente descartada');
    },
    (error) =>
      queueErrorMessage(
        error,
        'No fue posible descartar la finca. Inténtalo nuevamente.',
      ),
    control,
  );
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar la finca ${farm.name}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. Esta acción no se puede deshacer.',
    confirm: 'Descartar finca',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return (
    <StatusChangeDialog
      trigger={control ? undefined : action}
      action={action}
      {...dialog}
    />
  );
}
