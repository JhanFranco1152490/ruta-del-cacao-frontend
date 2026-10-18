'use client';

import { Trash2 } from 'lucide-react';
import { useId } from 'react';
import {
  type Control,
  Controller,
  type FieldValues,
  type Path,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { UNIT_SYMBOLS, type InputUnit } from '@/lib/format/input-units';
import {
  type CatalogInput,
  stockReferenceText,
  usedQuantityText,
} from '@/lib/input-usage';

import { UsedInputPicker } from './used-input-picker';

const unitOf = (input: CatalogInput) =>
  UNIT_SYMBOLS[input.unit as InputUnit]?.plural ?? input.unit;

// Un insumo usado en la labor: se busca y se elige en un solo campo, y se escribe cuánto se gastó,
// en la unidad del insumo. Debajo se ve lo que equivale en empaques y lo que hay en la finca, que
// es solo una referencia: no limita la cantidad, porque la labor ya se hizo. El número va una vez,
// en el título de la fila, que nombra a sus campos para quien usa lector de pantalla.
export function UsedInputRow<TForm extends FieldValues>({
  index,
  control,
  rowPath,
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
  control: Control<TForm>;
  // Dónde está esta fila dentro del formulario ("inputs.0").
  rowPath: string;
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
        name={`${rowPath}.input_id` as Path<TForm>}
        render={({ field }) => (
          <UsedInputPicker
            catalog={catalog}
            disabled={disabled}
            error={errors.input_id ?? (field.value ? undefined : notice)}
            onChange={field.onChange}
            takenIds={takenIds}
            value={field.value as string}
          />
        )}
      />
      <Controller
        control={control}
        name={`${rowPath}.quantity` as Path<TForm>}
        render={({ field }) => (
          <TextField
            className={CAPTURE_FIELD_CLASS}
            disabled={disabled}
            error={errors.quantity}
            hint={equivalent ?? undefined}
            inputMode="decimal"
            label={selected ? `Cantidad (${unitOf(selected)})` : 'Cantidad'}
            name={field.name}
            onBlur={field.onBlur}
            onChange={field.onChange}
            ref={field.ref}
            value={(field.value as string | undefined) ?? ''}
          />
        )}
      />
      {selected && stock !== undefined && (
        <p className="text-sm text-muted-foreground">
          {stockReferenceText(stock, selected)}
        </p>
      )}
    </li>
  );
}
