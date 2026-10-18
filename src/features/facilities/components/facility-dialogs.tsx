'use client';

import type { FarmOption } from '@/lib/api/farm-options';
import { notify } from '@/lib/notify';

import type { PostharvestFacility } from '../api';
import type { FacilityActionKind } from '../facility-actions';
import { FacilityFormDialog } from './facility-form-dialog';

export type PendingFacilityAction =
  | { kind: 'create' }
  | { kind: FacilityActionKind; facility: PostharvestFacility };

// El diálogo de la acción que se eligió. Cada uno se monta al abrirse y se desmonta al cerrarse,
// así que siempre parte de los datos de ese momento.
export function FacilityDialogs({
  pending,
  farms,
  farmId,
  known,
  onClose,
  onShowElement,
}: {
  pending: PendingFacilityAction | undefined;
  farms: readonly FarmOption[];
  farmId: string;
  known: readonly PostharvestFacility[];
  onClose: () => void;
  onShowElement: (id: string) => void;
}) {
  if (!pending) return null;
  const onSaved = (message: string | null) => {
    if (message) notify.success(message);
    onClose();
  };
  const showExisting = (id: string) => {
    onClose();
    onShowElement(id);
  };

  if (pending.kind === 'create' || pending.kind === 'edit') {
    return (
      <FacilityFormDialog
        facility={pending.kind === 'edit' ? pending.facility : undefined}
        farmId={farmId}
        farms={farms}
        known={known}
        onClose={onClose}
        onSaved={onSaved}
        onShowExisting={showExisting}
      />
    );
  }
  return null;
}
