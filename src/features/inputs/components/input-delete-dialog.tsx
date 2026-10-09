'use client';

import { PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

import {
  type AgriculturalInput,
  INPUT_ERROR,
  useDeleteAgriculturalInput,
  useUpdateAgriculturalInput,
} from '../api';
import {
  INPUT_DEACTIVATED_MESSAGE,
  INPUT_DELETED_MESSAGE,
} from '../input-form-values';
import { inputChangeErrorMessage } from './input-status-dialog';

const deleteAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `¿Eliminar ${name}?`,
  description:
    'Solo para insumos creados por error. Se borra del catálogo y no se puede deshacer; su historial de cambios se conserva.',
  confirm: 'Eliminar insumo',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

const deactivateAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `No se puede eliminar ${name}`,
  description:
    'Ya tiene movimientos o se usó en registros. Desactivarlo deja de ofrecerlo en nuevas actividades y controles sin perder lo registrado.',
  confirm: 'Desactivar insumo',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'default',
});

function deleteErrorMessage(error: unknown, isActive: boolean) {
  if (isApiError(error) && error.code === INPUT_ERROR.hasRecords) {
    return isActive
      ? 'Alguien lo usó mientras tanto, así que ya no se puede eliminar. Puedes desactivarlo.'
      : 'Alguien lo usó mientras tanto, así que ya no se puede eliminar. Ya está inactivo.';
  }
  return inputChangeErrorMessage(
    error,
    'No fue posible eliminar el insumo. Revisa tu conexión e inténtalo nuevamente.',
  );
}

// Eliminar es solo para un insumo sin registros. La lista no ofrece eliminar uno que los tiene,
// pero alguien pudo usarlo entre que se cargó la lista y se confirmó: entonces el servidor lo
// rechaza y el mismo diálogo ofrece desactivarlo.
export function InputDeleteDialog({
  input,
  onClose,
  onDone,
}: {
  input: AgriculturalInput;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const remove = useDeleteAgriculturalInput();
  const update = useUpdateAgriculturalInput();
  const [hasRecords, setHasRecords] = useState(false);
  const offerDeactivate = hasRecords && input.is_active;

  const dialog = useConfirmAction(
    async () => {
      if (offerDeactivate) {
        // El rechazo no cambió el insumo: la versión leída sigue siendo la vigente.
        await update.mutateAsync({
          id: input.id,
          body: { is_active: false, expected_version: input.version },
        });
        onDone(INPUT_DEACTIVATED_MESSAGE);
        return;
      }
      try {
        await remove.mutateAsync({
          id: input.id,
          expectedVersion: input.version,
        });
      } catch (error) {
        if (isApiError(error) && error.code === INPUT_ERROR.hasRecords) {
          setHasRecords(true);
        }
        throw error;
      }
      onDone(INPUT_DELETED_MESSAGE);
    },
    (error) =>
      offerDeactivate
        ? getErrorMessage(
            error,
            'No fue posible desactivar el insumo. Inténtalo nuevamente.',
          )
        : deleteErrorMessage(error, input.is_active),
  );

  return (
    <StatusChangeDialog
      {...dialog}
      action={
        offerDeactivate
          ? deactivateAction(input.name)
          : deleteAction(input.name)
      }
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    />
  );
}
