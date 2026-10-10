'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { UNIT_SYMBOLS, type InputUnit } from '@/lib/format/input-units';

import {
  type CompletionFormInput,
  stockReferenceText,
  usedQuantityText,
} from '../completion-rules';
import { type CatalogInput, inputChoices } from '../completion-values';

const unitOf = (input: CatalogInput) =>
  UNIT_SYMBOLS[input.unit as InputUnit]?.plural ?? input.unit;

// Un insumo usado en la labor: se busca en el catálogo, se elige y se escribe cuánto se gastó, en
// la unidad del insumo. Debajo se ve lo que equivale en empaques y lo que hay en la finca, que es
// solo una referencia: no limita la cantidad, porque la labor ya se hizo.
export function CompletionInputRow({
  index,
  register,
  catalog,
  selectedId,
  quantity,
  takenIds,
  stock,
  errors,
  notice,
  disabled,
  onRemove,
}: {
  index: number;
  register: UseFormRegister<CompletionFormInput>;
  catalog: readonly CatalogInput[];
  selectedId: string;
  quantity: string;
  // Los insumos de las demás filas: no se eligen dos veces.
  takenIds: ReadonlySet<string>;
  // Las existencias del insumo elegido en la finca, o `undefined` si no hay copia de ellas.
  stock: string | null | undefined;
  errors: { input_id?: string; quantity?: string };
  // Por qué hay que volver a elegir el insumo de esta fila.
  notice?: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  const [search, setSearch] = useState('');
  const number = index + 1;
  const selected = catalog.find((input) => input.id === selectedId);
  const choices = inputChoices(catalog, { search, selectedId, takenIds });
  const equivalent = selected && usedQuantityText(quantity, selected);

  return (
    <li className="space-y-3 rounded-(--radius-field) border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-sans text-base font-extrabold text-selva">
          Insumo {number}
        </h3>
        <Button
          aria-label={`Quitar insumo ${number}`}
          disabled={disabled}
          onClick={onRemove}
          size="office"
          type="button"
          variant="outline"
        >
          <Trash2 aria-hidden="true" className="size-4" /> Quitar
        </Button>
      </div>
      <TextField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        label={`Buscar insumo ${number}`}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Escribe parte del nombre"
        type="search"
        value={search}
      />
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={errors.input_id ?? (selectedId ? undefined : notice)}
        hint={
          choices.length === 0 ? 'Ningún insumo activo coincide.' : undefined
        }
        label={`Insumo ${number}`}
        {...register(`inputs.${index}.input_id`)}
      >
        <option value="">Elige un insumo</option>
        {choices.map(({ id, label, disabled: taken }) => (
          <option disabled={taken} key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <TextField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={errors.quantity}
        hint={equivalent ?? undefined}
        inputMode="decimal"
        label={
          selected
            ? `Cantidad del insumo ${number} (${unitOf(selected)})`
            : `Cantidad del insumo ${number}`
        }
        {...register(`inputs.${index}.quantity`)}
      />
      {selected && stock !== undefined && (
        <p className="text-sm text-muted-foreground">
          {stockReferenceText(stock, selected)}
        </p>
      )}
    </li>
  );
}
