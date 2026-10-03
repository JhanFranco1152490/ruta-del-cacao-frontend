'use client';

import { Trash2 } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';

import { plotQueueErrorMessage } from '../queue-error-message';
import { usePlotDiscard } from '../use-plot-queue';

export function PlotDiscardDialog({
  plotId,
  code,
}: {
  plotId: string;
  code: string;
}) {
  const discard = usePlotDiscard();
  const dialog = useConfirmAction(
    () => discard.mutateAsync(plotId),
    (error) =>
      plotQueueErrorMessage(
        error,
        'No fue posible descartar la parcela. Inténtalo nuevamente.',
      ),
  );
  const action: StatusChangeAction = {
    trigger: 'Descartar',
    title: `¿Descartar la parcela ${code}?`,
    description:
      'Se borrará de este dispositivo y no se enviará al servidor. Esta acción no se puede deshacer.',
    confirm: 'Descartar parcela',
    pending: 'Descartando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return <StatusChangeDialog trigger={action} action={action} {...dialog} />;
}
