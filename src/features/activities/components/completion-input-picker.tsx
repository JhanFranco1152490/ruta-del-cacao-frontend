'use client';

import { useState } from 'react';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { FormField } from '@/components/form-field';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';

import {
  type CatalogInput,
  type InputChoice,
  inputChoices,
} from '../completion-values';

// Un solo campo busca y elige el insumo: se escribe parte del nombre y la lista se va filtrando
// (sin tildes, mayúsculas ni espacios, como el catálogo). Los insumos de otras filas se ven, pero
// no se pueden elegir dos veces.
export function CompletionInputPicker({
  catalog,
  value,
  takenIds,
  error,
  disabled,
  onChange,
}: {
  catalog: readonly CatalogInput[];
  // El id del insumo elegido, o vacío.
  value: string;
  takenIds: ReadonlySet<string>;
  error?: string;
  disabled: boolean;
  onChange: (inputId: string) => void;
}) {
  // Lo que la persona está escribiendo; `null` mientras no escribe: el campo muestra entonces el
  // insumo elegido.
  const [typed, setTyped] = useState<string | null>(null);
  const selected = catalog.find((input) => input.id === value);
  const choices = inputChoices(catalog, {
    search: typed ?? '',
    // Mientras se busca, el elegido no se cuela entre los resultados si no coincide.
    selectedId: typed === null ? value : '',
    takenIds,
  });
  const selectedChoice: InputChoice | null = selected
    ? { id: selected.id, label: selected.name, disabled: false }
    : null;

  return (
    <FormField error={error} label="Insumo">
      {(control) => (
        <Combobox<InputChoice>
          // La lista ya llega filtrada: el campo no la vuelve a filtrar con otra regla.
          filter={null}
          inputValue={typed ?? selected?.name ?? ''}
          isItemEqualToValue={(a, b) => a.id === b.id}
          itemToStringLabel={(choice) => choice.label}
          items={choices}
          onInputValueChange={(text, details) =>
            setTyped(details.reason === 'input-change' ? text : null)
          }
          onValueChange={(choice) => onChange(choice?.id ?? '')}
          value={selectedChoice}
        >
          <ComboboxInput
            {...control}
            className={`w-full ${CAPTURE_FIELD_CLASS}`}
            disabled={disabled}
            placeholder="Escribe para buscar un insumo"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>Ningún insumo activo coincide.</ComboboxEmpty>
            <ComboboxList>
              {(choice: InputChoice) => (
                <ComboboxItem
                  disabled={choice.disabled}
                  key={choice.id}
                  value={choice}
                >
                  {choice.label}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
    </FormField>
  );
}
