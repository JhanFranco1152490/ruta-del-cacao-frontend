'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';

import type { AgriculturalInput, ExistingInput } from '../api';
import { CatalogEntryDialog } from './catalog-entry-dialog';
import { InputDeleteDialog } from './input-delete-dialog';
import type { FarmChoice } from './input-farm-select';
import { InputFormDialog } from './input-form-dialog';
import { InputMovementDialog } from './input-movement-dialog';
import type { InputActionKind } from './input-row-actions';
import { InputStatusDialog } from './input-status-dialog';

export type PendingAction = {
  kind: InputActionKind | 'create' | 'catalog-entry';
  input?: AgriculturalInput;
  // La búsqueda con la que abre la entrada de un insumo del catálogo.
  search?: string;
};

// Las fincas entre las que elige el diálogo de una entrada o un conteo. Quien tiene un productor
// propio (o la cuenta técnica con uno elegido) usa las de la lista. La cuenta técnica sin productor
// elegido no las tiene: el insumo ya dice de quién es, y se leen las fincas de ese productor.
function MovementDialogWithFarms({
  input,
  kind,
  farm,
  listFarms,
  onClose,
  onSaved,
}: {
  input: AgriculturalInput;
  kind: 'entry' | 'count';
  farm: string | null;
  listFarms: readonly FarmChoice[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { data: user } = useSession();
  const ownFarms = listFarms.length > 0;
  const fetched = useFarmOptions(user?.id, input.producer.id, {
    enabled: !ownFarms,
  });
  const options = fetched.data?.data.options;
  const farms = useMemo(
    () =>
      ownFarms
        ? listFarms
        : (options ?? []).map(({ id, name, isActive }) => ({
            id,
            name,
            is_active: isActive,
          })),
    [ownFarms, listFarms, options],
  );
  return (
    <InputMovementDialog
      farm={farm}
      farms={farms}
      input={input}
      kind={kind}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

// El diálogo de la acción que se eligió en la lista. Cada uno se monta al abrirse y se desmonta
// al cerrarse, así que siempre parte de los datos de ese momento.
export function InputDialogs({
  pending,
  catalog,
  producer,
  chooseProducer,
  employee = false,
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
  // Un empleado: limitado a sus fincas, sin cambiar la unidad de un insumo.
  employee?: boolean;
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
        employeeFarms={employee ? farms : undefined}
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
      <MovementDialogWithFarms
        farm={farm}
        input={pending.input}
        kind={pending.kind}
        listFarms={farms}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (pending?.kind === 'catalog-entry') {
    return (
      <CatalogEntryDialog
        farm={farm}
        farms={farms}
        initialSearch={pending.search}
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
