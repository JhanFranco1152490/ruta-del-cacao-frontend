'use client';

import { PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import {
  type ConfirmControl,
  useConfirmAction,
} from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError, isNotFound } from '@/lib/api/errors';
import { notify } from '@/lib/notify';

import { useChangePlotStatus, useDeletePlot } from '../api';
import type { KnownPlot } from '../known-plots';
import { plotLabel } from '@/lib/format/place-label';

const HAS_RECORDS = 'plot_has_records';

function deleteErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.code === 'stale_version') {
      return 'Alguien cambió esta parcela mientras tanto. Vuelve a abrir la finca para ver sus datos actuales.';
    }
    if (error.code === 'farm_inactive') {
      return 'La finca está inactiva: sus parcelas no se pueden eliminar.';
    }
  }
  return getErrorMessage(
    error,
    'No fue posible eliminar la parcela. Revisa tu conexión e inténtalo nuevamente.',
  );
}

const deleteAction = (code: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `¿Eliminar la parcela ${code}?`,
  description:
    'Solo para parcelas creadas por error. Libera su área, se borra del sistema y no se puede deshacer; su historial de cambios se conserva.',
  confirm: 'Eliminar parcela',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

const deactivateAction = (code: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `No se puede eliminar ${code}`,
  description:
    'Ya se usa en otros registros. Desactivarla libera su área y la retira de la operación sin perder sus datos ni su historial.',
  confirm: 'Desactivar parcela',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'destructive',
});

// Eliminar es en línea y con confirmación. Si algo depende de la parcela, el servidor no la deja
// eliminar y el mismo diálogo ofrece desactivarla en su lugar. Un 404 es que ya no existe: es lo
// que se pedía, así que cuenta como éxito.
export function PlotDeleteDialog({
  plot,
  farmId,
  control,
}: {
  plot: KnownPlot & { version: number };
  farmId: string;
  // Abierto desde un menú de acciones: sin botón propio.
  control?: ConfirmControl;
}) {
  const remove = useDeletePlot();
  const changeStatus = useChangePlotStatus();
  const [hasRecords, setHasRecords] = useState(false);
  const offerDeactivate = hasRecords && plot.isActive;

  const dialog = useConfirmAction(
    async () => {
      if (offerDeactivate) {
        await changeStatus.mutateAsync({
          id: plot.id,
          farmId,
          isActive: false,
          expectedVersion: plot.version,
        });
        notify.success('Parcela desactivada');
        return;
      }
      try {
        await remove.mutateAsync({
          id: plot.id,
          farmId,
          expectedVersion: plot.version,
        });
      } catch (error) {
        if (isNotFound(error)) return;
        if (isApiError(error) && error.code === HAS_RECORDS) {
          setHasRecords(true);
        }
        throw error;
      }
      notify.success('Parcela eliminada');
    },
    (error) =>
      offerDeactivate
        ? getErrorMessage(
            error,
            'No fue posible desactivar la parcela. Inténtalo nuevamente.',
          )
        : deleteErrorMessage(error),
    control,
  );

  const action = offerDeactivate
    ? deactivateAction(plotLabel(plot))
    : deleteAction(plotLabel(plot));

  return (
    <StatusChangeDialog
      {...dialog}
      action={action}
      onOpenChange={(open) => {
        if (dialog.isPending) return;
        dialog.onOpenChange(open);
        // Al cerrar se vuelve a ofrecer eliminar: el siguiente intento consulta de nuevo.
        if (!open) setHasRecords(false);
      }}
      trigger={control ? undefined : deleteAction(plotLabel(plot))}
    />
  );
}
