'use client';

import { Trash2 } from 'lucide-react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';

import type { FarmListItem } from '../farm-list-item';
import { queueErrorMessage } from '../queue-error-message';
import { useConfirmAction } from '../use-confirm-action';
import { useFarmDiscard } from '../use-farm-queue';

export function FarmDiscardDialog({ farm }: { farm: FarmListItem }) {
  const discard = useFarmDiscard();
  const dialog = useConfirmAction(
    () => discard.mutateAsync(farm.id),
    (error) =>
      queueErrorMessage(
        error,
        'No fue posible descartar la finca. Inténtalo nuevamente.',
      ),
  );
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar la finca ${farm.name}?`,
    description:
      'Se borrará de este teléfono y no se enviará al servidor. Esta acción no se puede deshacer.',
    confirm: 'Descartar finca',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog trigger={action} action={action} {...dialog} />;
}
