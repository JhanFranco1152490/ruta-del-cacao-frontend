'use client';

import { PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

import { type Farm, useChangeFarmStatus, useDeleteFarm } from '../api';
import { useConfirmAction } from '@/hooks/use-confirm-action';

const HAS_RECORDS = 'farm_has_records';

function deleteErrorMessage(error: unknown, isActive: boolean) {
  if (isApiError(error)) {
    if (error.code === HAS_RECORDS) {
      return isActive
        ? 'Esta finca tiene registros asociados (por ejemplo, parcelas) y no se puede eliminar. Puedes desactivarla: deja de figurar como activa sin perder sus datos.'
        : 'Esta finca tiene registros asociados (por ejemplo, parcelas) y no se puede eliminar. Ya está inactiva.';
    }
    if (error.code === 'stale_version') {
      return 'Alguien cambió esta finca mientras tanto. Vuelve a abrirla para ver sus datos actuales.';
    }
    if (error.status === 404) return 'Esta finca ya no existe.';
  }
  return getErrorMessage(
    error,
    'No fue posible eliminar la finca. Revisa tu conexión e inténtalo nuevamente.',
  );
}

const deleteAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar finca',
  title: `¿Eliminar la finca ${name}?`,
  description:
    'Solo para fincas creadas por error. Se borra del sistema y no se puede deshacer; su historial de cambios se conserva.',
  confirm: 'Eliminar finca',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

const deactivateAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar finca',
  title: `No se puede eliminar ${name}`,
  description:
    'Tiene registros asociados. Desactivarla la retira de la operación habitual sin perder sus datos ni su historial.',
  confirm: 'Desactivar finca',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'destructive',
});

// Eliminar es en línea y con confirmación. Si la finca tiene registros del negocio, el servidor
// no la deja eliminar y el mismo diálogo ofrece desactivarla en su lugar.
export function FarmDeleteDialog({
  farm,
  onDone,
}: {
  farm: Farm;
  onDone: () => void;
}) {
  const remove = useDeleteFarm();
  const changeStatus = useChangeFarmStatus();
  const [hasRecords, setHasRecords] = useState(false);
  const offerDeactivate = hasRecords && farm.is_active;

  const dialog = useConfirmAction(
    async () => {
      if (offerDeactivate) {
        await changeStatus.mutateAsync({
          id: farm.id,
          isActive: false,
          expectedVersion: farm.version,
        });
      } else {
        try {
          await remove.mutateAsync({
            id: farm.id,
            expectedVersion: farm.version,
          });
        } catch (error) {
          if (isApiError(error) && error.code === HAS_RECORDS) {
            setHasRecords(true);
          }
          throw error;
        }
      }
      onDone();
    },
    (error) =>
      offerDeactivate
        ? getErrorMessage(
            error,
            'No fue posible desactivar la finca. Inténtalo nuevamente.',
          )
        : deleteErrorMessage(error, farm.is_active),
  );

  const action = offerDeactivate
    ? deactivateAction(farm.name)
    : deleteAction(farm.name);

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
      trigger={deleteAction(farm.name)}
    />
  );
}
