'use client';

import { Power, PowerOff } from 'lucide-react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { facilityName } from '@/lib/facility-labels';

import { type PostharvestFacility, useUpdateFacility } from '../api';
import {
  activatedMessage,
  activateText,
  deactivatedMessage,
  deactivateText,
  facilityChangeErrorMessage,
} from '../facility-messages';

const actionFor = (facility: PostharvestFacility): StatusChangeAction => {
  const name = facilityName(facility.facility_type, facility.name);
  return facility.is_active
    ? {
        trigger: 'Desactivar',
        title: `¿Desactivar ${name}?`,
        description: deactivateText(facility),
        confirm: 'Desactivar',
        pending: 'Desactivando…',
        Icon: PowerOff,
        variant: 'default',
      }
    : {
        trigger: 'Activar',
        title: `¿Activar ${name}?`,
        description: activateText(facility),
        confirm: 'Activar',
        pending: 'Activando…',
        Icon: Power,
        variant: 'default',
      };
};

// Desactivar se puede deshacer, así que no es una acción destructiva: usa el botón principal.
// El servidor rechaza desactivar uno que se ocupó después de cargar la lista, y el diálogo lo dice.
export function FacilityStatusDialog({
  facility,
  onClose,
  onDone,
}: {
  facility: PostharvestFacility;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const update = useUpdateFacility();
  const activate = !facility.is_active;
  const dialog = useConfirmAction(
    async () => {
      await update.mutateAsync({
        id: facility.id,
        body: { is_active: activate, expected_version: facility.version },
      });
      onDone(
        activate ? activatedMessage(facility) : deactivatedMessage(facility),
      );
    },
    (error) =>
      facilityChangeErrorMessage(
        error,
        'No fue posible cambiar el estado del elemento. Revisa tu conexión e inténtalo nuevamente.',
      ),
  );

  return (
    <StatusChangeDialog
      {...dialog}
      action={actionFor(facility)}
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    />
  );
}
