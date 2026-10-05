'use client';

import { PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import {
  useDeleteAccount,
  useSetAccountStatus,
  type Account,
} from '@/lib/api/accounts';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

const HAS_ACTIVITY = 'account_has_activity';

const deleteAction: StatusChangeAction = {
  trigger: 'Eliminar cuenta',
  title: '¿Eliminar la cuenta?',
  description:
    'Solo para cuentas creadas por error: esta persona nunca ha iniciado sesión. Se borra su acceso y no se puede deshacer; el historial se conserva sin sus datos.',
  confirm: 'Eliminar cuenta',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
};

const deactivateAction: StatusChangeAction = {
  trigger: 'Eliminar cuenta',
  title: 'No se puede eliminar esta cuenta',
  description:
    'La persona ya inició sesión. Desactivarla bloquea su acceso sin perder su historial.',
  confirm: 'Desactivar cuenta',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'destructive',
};

// Eliminar es en línea y con confirmación. Si la cuenta ya inició sesión, el servidor no la deja
// eliminar y el mismo diálogo ofrece desactivarla. `last_administrator` y `self_modification` se
// explican con el mensaje de la API.
export function AccountDeleteDialog({
  account,
  onDeleted,
}: {
  account: Pick<Account, 'id' | 'status'>;
  onDeleted: () => void;
}) {
  const remove = useDeleteAccount();
  const deactivate = useSetAccountStatus(account.id);
  const [hasActivity, setHasActivity] = useState(false);
  const offerDeactivate = hasActivity && account.status === 'active';

  const dialog = useConfirmAction(
    async () => {
      if (offerDeactivate) {
        await deactivate.mutateAsync('inactive');
        return;
      }
      try {
        await remove.mutateAsync(account.id);
      } catch (error) {
        if (isApiError(error) && error.code === HAS_ACTIVITY) {
          setHasActivity(true);
        }
        throw error;
      }
      onDeleted();
    },
    (error) =>
      offerDeactivate
        ? getErrorMessage(
            error,
            'No fue posible desactivar la cuenta. Inténtalo nuevamente.',
          )
        : isApiError(error) && error.status === 404
          ? 'Esta cuenta ya no existe.'
          : getErrorMessage(
              error,
              'No fue posible eliminar la cuenta. Revisa tu conexión e inténtalo nuevamente.',
            ),
  );

  return (
    <StatusChangeDialog
      {...dialog}
      action={offerDeactivate ? deactivateAction : deleteAction}
      trigger={deleteAction}
      onOpenChange={(open) => {
        if (dialog.isPending) return;
        dialog.onOpenChange(open);
        // Al cerrar se vuelve a ofrecer eliminar: el siguiente intento consulta de nuevo.
        if (!open) setHasActivity(false);
      }}
    />
  );
}
