'use client';

import type { Buyer } from '../api';
import type { BuyerActionKind } from '../buyer-actions';
import { BuyerFormDialog } from './buyer-form-dialog';

export type PendingBuyerAction =
  { kind: 'create' } | { kind: BuyerActionKind; buyer: Buyer };

// El diálogo de la acción que se eligió en la lista, en una fila o en la hoja del celular.
export function BuyerDialogs({
  pending,
  known,
  producer,
  chooseProducer,
  onClose,
  onSaved,
  onShowExisting,
}: {
  pending: PendingBuyerAction | undefined;
  known: readonly Buyer[];
  producer: string | null;
  chooseProducer: boolean;
  onClose: () => void;
  onSaved: (message: string | null) => void;
  onShowExisting: (id: string) => void;
}) {
  if (!pending) return null;
  switch (pending.kind) {
    case 'create':
    case 'edit':
      return (
        <BuyerFormDialog
          buyer={pending.kind === 'edit' ? pending.buyer : undefined}
          // Una edición abre un formulario nuevo: no conserva lo de otro comprador.
          key={pending.kind === 'edit' ? pending.buyer.id : 'create'}
          chooseProducer={chooseProducer}
          known={known}
          onClose={onClose}
          onSaved={onSaved}
          onShowExisting={onShowExisting}
          producer={producer}
        />
      );
    default:
      return null;
  }
}
