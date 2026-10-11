'use client';

import { Trash2 } from 'lucide-react';
import { useId } from 'react';
import {
  type Control,
  Controller,
  type UseFormRegister,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { UNIT_SYMBOLS, type InputUnit } from '@/lib/format/input-units';

import {
  type CompletionFormInput,
  type CompletionFormValues,
  stockReferenceText,
  usedQuantityText,
} from '../completion-rules';
import type { CatalogInput } from '../completion-values';
import { CompletionInputPicker } from './completion-input-picker';

const unitOf = (input: CatalogInput) =>
  UNIT_SYMBOLS[input.unit as InputUnit]?.plural ?? input.unit;

// Un insumo usado en la labor: se busca y se elige en un solo campo, y se escribe cuánto se gastó,
// en la unidad del insumo. Debajo se ve lo que equivale en empaques y lo que hay en la finca, que
// es solo una referencia: no limita la cantidad, porque la labor ya se hizo. El número va una vez,
// en el título de la fila, que nombra a sus campos para quien usa lector de pantalla.
export function CompletionInputRow({
  index,
  control,
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
  control: Control<CompletionFormInput, unknown, CompletionFormValues>;
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
  const titleId = useId();
  const number = index + 1;
  const selected = catalog.find((input) => input.id === selectedId);
  const equivalent = selected && usedQuantityText(quantity, selected);

  return (
    <li
      aria-labelledby={titleId}
      className="space-y-3 rounded-(--radius-field) border border-border bg-card p-4"
      role="group"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="font-sans text-base font-extrabold text-selva"
          id={titleId}
        >
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
      <Controller
        control={control}
        name={`inputs.${index}.input_id`}
        render={({ field }) => (
          <CompletionInputPicker
            catalog={catalog}
            disabled={disabled}
            error={errors.input_id ?? (field.value ? undefined : notice)}
            onChange={field.onChange}
            takenIds={takenIds}
            value={field.value}
          />
        )}
      />
      <TextField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={errors.quantity}
        hint={equivalent ?? undefined}
        inputMode="decimal"
        label={selected ? `Cantidad (${unitOf(selected)})` : 'Cantidad'}
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
