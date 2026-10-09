'use client';

import type { AgriculturalInput, ExistingInput } from '../api';
import { InputFormDialog } from './input-form-dialog';
import type { InputActionKind } from './input-row-actions';

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
  onClose,
  onSaved,
  onShowExisting,
}: {
  pending: PendingAction | undefined;
  catalog: readonly AgriculturalInput[];
  producer: string | null;
  chooseProducer: boolean;
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
  return null;
}
