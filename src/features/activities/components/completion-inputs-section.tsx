'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
  useWatch,
} from 'react-hook-form';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { Button } from '@/components/ui/button';

import type {
  CompletionFormInput,
  CompletionFormValues,
} from '../completion-rules';
import {
  type CatalogInput,
  UNAVAILABLE_INPUT_MESSAGE,
} from '../completion-values';
import { CompletionInputRow } from './completion-input-row';

export const NO_CATALOG_MESSAGE =
  'Necesitas conexión una vez para cargar los insumos.';

// Los insumos que gastó la labor: ninguno, uno o varios. Empieza vacía, porque no toda labor los
// usa.
export function CompletionInputsSection({
  control,
  register,
  errors,
  catalog,
  stocks,
  unavailableRows,
  disabled,
}: {
  control: Control<CompletionFormInput, unknown, CompletionFormValues>;
  register: UseFormRegister<CompletionFormInput>;
  errors: FieldErrors<CompletionFormInput>;
  // `undefined` si el catálogo nunca se cargó en este dispositivo: se registra sin insumos.
  catalog: readonly CatalogInput[] | undefined;
  // Las existencias de la finca por insumo, o `undefined` si no hay copia de ellas.
  stocks: ReadonlyMap<string, string> | undefined;
  // Las filas cuyo insumo hay que volver a elegir.
  unavailableRows: readonly number[];
  disabled: boolean;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'inputs' });
  const rows = useWatch({ control, name: 'inputs' });
  // Se fija al abrir, por el id de cada fila: el aviso sigue a su fila aunque se quiten otras.
  const [unavailableIds] = useState(
    () => new Set(unavailableRows.map((index) => fields[index]?.id)),
  );

  return (
    <FormSection title="Insumos utilizados">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Si la labor no usó insumos, guárdala sin agregar ninguno.
        </p>
        {fields.length > 0 && catalog && (
          <ul className="space-y-4">
            {fields.map((field, index) => {
              const row = rows?.[index] ?? field;
              const others = (rows ?? [])
                .filter((_, other) => other !== index)
                .map((other) => other.input_id)
                .filter(Boolean);
              return (
                <CompletionInputRow
                  catalog={catalog}
                  control={control}
                  disabled={disabled}
                  errors={{
                    input_id: errors.inputs?.[index]?.input_id?.message,
                    quantity: errors.inputs?.[index]?.quantity?.message,
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
                  register={register}
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
          aria-describedby={catalog ? undefined : 'completion-no-catalog'}
          className={CAPTURE_BUTTON_CLASS}
          disabled={disabled || !catalog}
          onClick={() => append({ input_id: '', quantity: '' })}
          size="office"
          type="button"
          variant="outline"
        >
          <Plus aria-hidden="true" className="size-5" /> Agregar insumo
        </Button>
        {!catalog && (
          <p className="text-sm font-bold text-warn" id="completion-no-catalog">
            {NO_CATALOG_MESSAGE}
          </p>
        )}
      </div>
    </FormSection>
  );
}
