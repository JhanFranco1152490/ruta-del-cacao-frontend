'use client';

import { PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { isApiError } from '@/lib/api/errors';
import { agreeWith, facilityName } from '@/lib/facility-labels';

import {
  type PostharvestFacility,
  useDeleteFacility,
  useUpdateFacility,
} from '../api';
import {
  FACILITY_ERROR,
  type OccupyingLot,
  occupyingLotOf,
} from '../facility-errors';
import {
  deactivatedMessage,
  FACILITY_DELETED_MESSAGE,
  facilityChangeErrorMessage,
} from '../facility-messages';
import { FacilityOccupiedDialog } from './facility-occupied-dialog';

const deleteAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `¿Eliminar ${name}?`,
  description: 'Esta acción no se puede deshacer.',
  confirm: 'Eliminar',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

const usedText = (facility: PostharvestFacility) =>
  `Alguien lo usó en un proceso mientras tanto, así que ya no se puede eliminar. ${
    facility.is_active
      ? `Puedes ${agreeWith(facility.facility_type, 'desactivarl')}.`
      : `Ya está ${agreeWith(facility.facility_type, 'inactiv')}.`
  }`;

const deactivateInstead = (
  name: string,
  facility: PostharvestFacility,
): StatusChangeAction => ({
  trigger: 'Eliminar',
  title: `No se puede eliminar ${name}`,
  description: usedText(facility),
  confirm: 'Desactivar',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'default',
});

// Eliminar es solo para uno creado por error, sin registros y libre. La lista no ofrece eliminar
// uno usado, pero alguien pudo usarlo entre que se cargó la lista y se confirmó: entonces el
// servidor lo rechaza y el mismo diálogo ofrece desactivarlo.
export function FacilityDeleteDialog({
  facility,
  lotHref,
  onClose,
  onDone,
}: {
  facility: PostharvestFacility;
  lotHref?: (id: string) => string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const remove = useDeleteFacility();
  const update = useUpdateFacility();
  const [hasRecords, setHasRecords] = useState(false);
  // Un lote lo ocupó mientras tanto, y qué se intentaba hacer cuando el servidor lo dijo.
  const [occupied, setOccupied] = useState<{
    lot: OccupyingLot;
    verb: 'desactivar' | 'eliminar';
  }>();
  const offerDeactivate = hasRecords && facility.is_active;
  const name = facilityName(facility.facility_type, facility.name);
  const verb = offerDeactivate ? 'desactivar' : 'eliminar';

  const dialog = useConfirmAction(
    async () => {
      try {
        if (offerDeactivate) {
          // El rechazo no cambió el elemento: la versión leída sigue siendo la vigente.
          await update.mutateAsync({
            id: facility.id,
            body: { is_active: false, expected_version: facility.version },
          });
        } else {
          await remove.mutateAsync({
            id: facility.id,
            expectedVersion: facility.version,
          });
        }
      } catch (error) {
        if (isApiError(error) && error.code === FACILITY_ERROR.hasRecords) {
          setHasRecords(true);
        }
        const lot = occupyingLotOf(error);
        if (lot) setOccupied({ lot, verb });
        throw error;
      }
      onDone(
        offerDeactivate
          ? deactivatedMessage(facility)
          : FACILITY_DELETED_MESSAGE,
      );
    },
    (error) =>
      isApiError(error) && error.code === FACILITY_ERROR.hasRecords
        ? usedText(facility)
        : facilityChangeErrorMessage(
            error,
            'No fue posible eliminar el elemento. Revisa tu conexión e inténtalo nuevamente.',
          ),
  );

  if (occupied) {
    return (
      <FacilityOccupiedDialog
        lot={occupied.lot}
        lotHref={lotHref}
        onClose={onClose}
        title={`¿${occupied.verb === 'eliminar' ? 'Eliminar' : 'Desactivar'} ${name}?`}
        verb={occupied.verb}
      />
    );
  }
  return (
    <StatusChangeDialog
      {...dialog}
      // Al ofrecer desactivar, el motivo ya está en la descripción.
      error={offerDeactivate ? undefined : dialog.error}
      action={
        offerDeactivate ? deactivateInstead(name, facility) : deleteAction(name)
      }
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    />
  );
}
