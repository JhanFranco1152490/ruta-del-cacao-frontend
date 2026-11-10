'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';

import type { Buyer } from '../api';
import { buyerChangeErrorMessage } from '../buyer-errors';
import {
  ACTIVATE_TEXT,
  activateTitle,
  BUYER_ACTIVATED_MESSAGE,
  BUYER_DEACTIVATED_MESSAGE,
  DEACTIVATE_TEXT,
  deactivateTitle,
} from '../buyer-messages';
import { useUpdateBuyer } from '../mutations';

const actionFor = (buyer: Buyer): StatusChangeAction =>
  buyer.is_active
    ? {
        trigger: 'Desactivar',
        title: deactivateTitle(buyer.name),
        description: DEACTIVATE_TEXT,
        confirm: 'Desactivar',
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'default',
      }
    : {
        trigger: 'Activar',
        title: activateTitle(buyer.name),
        description: ACTIVATE_TEXT,
        confirm: 'Activar',
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };

// Desactivar se puede deshacer, así que no es una acción destructiva: usa el botón principal.
export function BuyerStatusDialog({
  buyer,
  onClose,
  onDone,
}: {
  buyer: Buyer;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const update = useUpdateBuyer();
  const activate = !buyer.is_active;
  const dialog = useConfirmAction(
    async () => {
      await update.mutateAsync({
        id: buyer.id,
        body: { is_active: activate, expected_version: buyer.version },
      });
      onDone(activate ? BUYER_ACTIVATED_MESSAGE : BUYER_DEACTIVATED_MESSAGE);
    },
    (error) =>
      buyerChangeErrorMessage(
        error,
        'No fue posible cambiar el estado del comprador. Revisa tu conexión e inténtalo nuevamente.',
      ),
  );

  return (
    <StatusChangeDialog
      {...dialog}
      action={actionFor(buyer)}
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    />
  );
}
