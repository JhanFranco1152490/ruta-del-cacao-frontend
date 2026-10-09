'use client';

import type { AgriculturalInput, ExistingInput } from '../api';
import { InputDeleteDialog } from './input-delete-dialog';
import type { FarmChoice } from './input-farm-select';
import { InputFormDialog } from './input-form-dialog';
import { InputMovementDialog } from './input-movement-dialog';
import type { InputActionKind } from './input-row-actions';
import { InputStatusDialog } from './input-status-dialog';

export type PendingAction = {
  kind: InputActionKind | 'create';
  input?: AgriculturalInput;
};

// El diálogo de la acción que se eligió en la lista. Cada uno se monta al abrirse y se desmonta
// al cerrarse, así que siempre parte de los datos de ese momento.
export function InputDialogs({
  pending,
  catalog,
  producer,
  chooseProducer,
  farms,
  farm,
  onClose,
  onSaved,
  onShowExisting,
}: {
  pending: PendingAction | undefined;
  catalog: readonly AgriculturalInput[];
  producer: string | null;
  chooseProducer: boolean;
  farms: readonly FarmChoice[];
  farm: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onShowExisting: (existing: ExistingInput) => void;
}) {
  if (pending?.kind === 'create' || pending?.kind === 'edit') {
    return (
      <InputFormDialog
        catalog={catalog}
        chooseProducer={chooseProducer}
        input={pending.input}
        onClose={onClose}
        onSaved={onSaved}
        onShowExisting={onShowExisting}
        producer={producer}
      />
    );
  }
  if (pending?.kind === 'status' && pending.input) {
    return (
      <InputStatusDialog
        input={pending.input}
        onClose={onClose}
        onDone={onSaved}
      />
    );
  }
  if (
    (pending?.kind === 'entry' || pending?.kind === 'count') &&
    pending.input
  ) {
    return (
      <InputMovementDialog
        farm={farm}
        farms={farms}
        input={pending.input}
        kind={pending.kind}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (pending?.kind === 'delete' && pending.input) {
    return (
      <InputDeleteDialog
        input={pending.input}
        onClose={onClose}
        onDone={onSaved}
      />
    );
  }
  return null;
}
