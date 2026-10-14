'use client';

import { Trash2 } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import {
  type ConfirmControl,
  useConfirmAction,
} from '@/hooks/use-confirm-action';
import { notify } from '@/lib/notify';

import { plotQueueErrorMessage } from '../queue-error-message';
import { usePlotDiscard } from '../use-plot-queue';

export function PlotDiscardDialog({
  plotId,
  code,
  control,
}: {
  plotId: string;
  code: string;
  // Abierto desde un menú de acciones: sin botón propio.
  control?: ConfirmControl;
}) {
  const discard = usePlotDiscard();
  const dialog = useConfirmAction(
    async () => {
      await discard.mutateAsync(plotId);
      notify.success('Parcela pendiente descartada');
    },
    (error) =>
      plotQueueErrorMessage(
        error,
        'No fue posible descartar la parcela. Inténtalo nuevamente.',
      ),
    control,
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

  return (
    <StatusChangeDialog
      trigger={control ? undefined : action}
      action={action}
      {...dialog}
    />
  );
}
