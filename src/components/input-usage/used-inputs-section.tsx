'use client';

import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import {
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldArrayPathByValue,
  type FieldValues,
  get,
  type Path,
  useFieldArray,
  useFormState,
  useWatch,
} from 'react-hook-form';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { Button } from '@/components/ui/button';
import {
  type CatalogInput,
  UNAVAILABLE_INPUT_MESSAGE,
  type UsedInputRow as UsedInputValue,
} from '@/lib/input-usage';

import { UsedInputRow } from './used-input-row';

export const NO_CATALOG_MESSAGE =
  'Necesitas conexión una vez para cargar los insumos.';

const EMPTY_ROW: UsedInputValue = { input_id: '', quantity: '' };

// Los insumos que gastó una labor: ninguno, uno o varios. Empieza vacía, porque no toda labor los
// usa. Sirve para cualquier formulario: `name` dice dónde está la lista ("inputs", o la de un
// control dentro de una detección), y solo acepta una lista de filas de insumo.
export function UsedInputsSection<TForm extends FieldValues>({
  control,
  name,
  catalog,
  stocks,
  unavailableRows = [],
  hint,
  disabled,
}: {
  control: Control<TForm>;
  name: FieldArrayPathByValue<TForm, UsedInputValue[]>;
  // `undefined` si el catálogo nunca se cargó en este dispositivo: se registra sin insumos.
  catalog: readonly CatalogInput[] | undefined;
  // Las existencias de la finca por insumo, o `undefined` si no hay copia de ellas.
  stocks: ReadonlyMap<string, string> | undefined;
  // Las filas cuyo insumo hay que volver a elegir.
  unavailableRows?: readonly number[];
  // Lo que conviene saber antes de agregar ("Si la labor no usó insumos…").
  hint?: string;
  disabled: boolean;
}) {
  const noCatalogId = useId();
  const { fields, append, remove } = useFieldArray({
    control,
    name: name as ArrayPath<TForm>,
  });
  const rows = useWatch({ control, name: name as Path<TForm> }) as
    UsedInputValue[] | undefined;
  const { errors } = useFormState({ control, name: name as Path<TForm> });
  const errorOf = (index: number, field: keyof UsedInputValue) =>
    (
      get(errors, `${name}.${index}.${field}`) as
        { message?: string } | undefined
    )?.message;
  // Se fija al abrir, por el id de cada fila: el aviso sigue a su fila aunque se quiten otras.
  const [unavailableIds] = useState(
    () => new Set(unavailableRows.map((index) => fields[index]?.id)),
  );

  return (
    <FormSection title="Insumos utilizados">
      <div className="space-y-4">
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        {fields.length > 0 && catalog && (
          <ul className="space-y-4">
            {fields.map((field, index) => {
              const row = rows?.[index] ?? EMPTY_ROW;
              const others = (rows ?? [])
                .filter((_, other) => other !== index)
                .map((other) => other.input_id)
                .filter(Boolean);
              return (
                <UsedInputRow
                  catalog={catalog}
                  control={control}
                  disabled={disabled}
                  errors={{
                    input_id: errorOf(index, 'input_id'),
                    quantity: errorOf(index, 'quantity'),
                  }}
                  index={index}
                  key={field.id}
                  notice={
                    unavailableIds.has(field.id)
                      ? UNAVAILABLE_INPUT_MESSAGE
                      : undefined
                  }
                  onRemove={() => remove(index)}
                  quantity={row.quantity}
                  rowPath={`${name}.${index}`}
                  selectedId={row.input_id}
                  stock={
                    stocks && row.input_id
                      ? (stocks.get(row.input_id) ?? null)
                      : undefined
                  }
                  takenIds={new Set(others)}
                />
              );
            })}
          </ul>
        )}
        <Button
          aria-describedby={catalog ? undefined : noCatalogId}
          className={CAPTURE_BUTTON_CLASS}
          disabled={disabled || !catalog}
          onClick={() =>
            append({ ...EMPTY_ROW } as FieldArray<TForm, ArrayPath<TForm>>)
          }
          size="office"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-5" /> Agregar insumo
        </Button>
        {!catalog && (
          <p className="text-sm font-bold text-warn" id={noCatalogId}>
            {NO_CATALOG_MESSAGE}
          </p>
        )}
      </div>
    </FormSection>
  );
}
