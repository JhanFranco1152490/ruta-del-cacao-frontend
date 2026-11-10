'use client';

import { PowerOff, Trash2, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';

import type { Buyer } from '../api';
import { buyerChangeErrorMessage, isBuyerWithRecords } from '../buyer-errors';
import {
  BUYER_DEACTIVATED_MESSAGE,
  BUYER_DELETED_MESSAGE,
  BUYER_HAS_RECORDS_REASON,
  DELETE_TEXT,
  DELETE_WARNING,
  deleteTitle,
} from '../buyer-messages';
import { useDeleteBuyer, useUpdateBuyer } from '../mutations';

const deleteAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: deleteTitle(name),
  description: DELETE_TEXT,
  confirm: 'Eliminar comprador',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

const deactivateInstead = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `No se puede eliminar a ${name}`,
  description: `${BUYER_HAS_RECORDS_REASON} Puedes desactivarlo para que deje de ofrecerse al registrar ventas.`,
  confirm: 'Desactivar',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'default',
});

// Eliminar es solo para uno creado por error, sin ventas: siempre con la advertencia y el foco en
// Cancelar. La lista no ofrece eliminar uno con ventas, pero una venta pudo registrarse desde otro
// dispositivo después de cargarla: entonces el servidor lo rechaza y el mismo diálogo ofrece
// desactivarlo.
export function BuyerDeleteDialog({
  buyer,
  onClose,
  onDone,
}: {
  buyer: Buyer;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const remove = useDeleteBuyer();
  const update = useUpdateBuyer();
  const [hasRecords, setHasRecords] = useState(false);
  const offerDeactivate = hasRecords && buyer.is_active;

  const dialog = useConfirmAction(
    async () => {
      try {
        if (offerDeactivate) {
          // El rechazo no cambió al comprador: la versión leída sigue siendo la vigente.
          await update.mutateAsync({
            id: buyer.id,
            body: { is_active: false, expected_version: buyer.version },
          });
        } else {
          await remove.mutateAsync({
            id: buyer.id,
            expectedVersion: buyer.version,
          });
        }
      } catch (error) {
        if (isBuyerWithRecords(error)) setHasRecords(true);
        throw error;
      }
      onDone(
        offerDeactivate ? BUYER_DEACTIVATED_MESSAGE : BUYER_DELETED_MESSAGE,
      );
    },
    (error) =>
      isBuyerWithRecords(error)
        ? BUYER_HAS_RECORDS_REASON
        : buyerChangeErrorMessage(
            error,
            'No fue posible eliminar el comprador. Revisa tu conexión e inténtalo nuevamente.',
          ),
  );

  return (
    <StatusChangeDialog
      {...dialog}
      // Al ofrecer desactivar, el motivo ya está en la descripción.
      error={offerDeactivate ? undefined : dialog.error}
      action={
        offerDeactivate
          ? deactivateInstead(buyer.name)
          : deleteAction(buyer.name)
      }
      focusCancel={!offerDeactivate}
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    >
      {!offerDeactivate && (
        <p className="flex gap-2 rounded-(--radius) bg-warn-bg px-4 py-3 text-sm font-bold text-warn">
          <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
          {DELETE_WARNING}
        </p>
      )}
    </StatusChangeDialog>
  );
}
