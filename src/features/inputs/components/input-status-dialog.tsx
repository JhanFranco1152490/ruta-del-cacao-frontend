'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

import {
  type AgriculturalInput,
  INPUT_ERROR,
  useUpdateAgriculturalInput,
} from '../api';
import {
  INPUT_ACTIVATED_MESSAGE,
  INPUT_DEACTIVATED_MESSAGE,
} from '../input-form-values';

const actionFor = (input: AgriculturalInput): StatusChangeAction =>
  input.is_active
    ? {
        trigger: 'Desactivar',
        title: `¿Desactivar ${input.name}?`,
        description:
          'Este insumo dejará de ofrecerse en nuevas actividades y controles. Los registros que ya lo usan y sus existencias no cambian.',
        confirm: 'Desactivar insumo',
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'default',
      }
    : {
        trigger: 'Activar',
        title: `¿Activar ${input.name}?`,
        description:
          'Vuelve a ofrecerse al registrar actividades y controles, y vuelve a recibir entradas.',
        confirm: 'Activar insumo',
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };

export function inputChangeErrorMessage(error: unknown, fallback: string) {
  if (isApiError(error)) {
    if (error.code === INPUT_ERROR.staleVersion) {
      return 'Otra persona cambió este insumo mientras tanto. Cierra y vuelve a intentarlo con sus datos actuales.';
    }
    if (error.status === 404) return 'Este insumo ya no existe.';
  }
  return getErrorMessage(error, fallback);
}

// Desactivar se puede deshacer, así que no es una acción destructiva: usa el botón principal.
export function InputStatusDialog({
  input,
  onClose,
  onDone,
}: {
  input: AgriculturalInput;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const update = useUpdateAgriculturalInput();
  const activate = !input.is_active;
  const dialog = useConfirmAction(
    async () => {
      await update.mutateAsync({
        id: input.id,
        body: { is_active: activate, expected_version: input.version },
      });
      onDone(activate ? INPUT_ACTIVATED_MESSAGE : INPUT_DEACTIVATED_MESSAGE);
    },
    (error) =>
      inputChangeErrorMessage(
        error,
        'No fue posible cambiar el estado del insumo. Revisa tu conexión e inténtalo nuevamente.',
      ),
  );

  return (
    <StatusChangeDialog
      {...dialog}
      action={actionFor(input)}
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    />
  );
}
