'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { AgriculturalActivity } from '../api';
import {
  type CompletionFormInput,
  type CompletionFormValues,
  createCompletionSchema,
} from '../completion-rules';
import {
  type CatalogInput,
  UNAVAILABLE_INPUT_MESSAGE,
} from '../completion-values';
import { CompletionInputRow } from './completion-input-row';

export const NO_CATALOG_MESSAGE =
  'Necesitas conexión una vez para cargar los insumos.';

// Lo que se registra de una labor hecha: cuándo y, si aplica, con qué insumos. Al enviar entrega
// los valores ya validados; quien lo usa los confirma con la persona antes de guardarlos, porque
// una realización no se corrige después.
export function CompletionForm({
  activity,
  today,
  catalog,
  stocks,
  defaultValues,
  unavailableRows = [],
  isSaving,
  submitLabel,
  blockedMessage,
  error,
  onSubmit,
  secondaryAction,
}: {
  activity: Pick<AgriculturalActivity, 'activity_type' | 'created_at'>;
  // La fecha de Bogotá: la realización no puede ser futura.
  today: string;
  // `undefined` si el catálogo nunca se cargó en este dispositivo: se registra sin insumos.
  catalog: readonly CatalogInput[] | undefined;
  // Las existencias de la finca por insumo, o `undefined` si no hay copia de ellas.
  stocks: ReadonlyMap<string, string> | undefined;
  defaultValues: CompletionFormInput;
  // Las filas cuyo insumo hay que volver a elegir.
  unavailableRows?: readonly number[];
  isSaving: boolean;
  submitLabel: string;
  blockedMessage?: string | null;
  error?: string | null;
  onSubmit: (values: CompletionFormValues) => void;
  secondaryAction?: ReactNode;
}) {
  const schema = useMemo(
    () => createCompletionSchema({ today, activity }),
    [today, activity],
  );
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, submitCount, isValid },
  } = useForm<CompletionFormInput, unknown, CompletionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'inputs' });
  const rows = useWatch({ control, name: 'inputs' });
  // Se fija al abrir, por el id de cada fila: el aviso sigue a su fila aunque se quiten otras.
  const [unavailableIds] = useState(
    () => new Set(unavailableRows.map((index) => fields[index]?.id)),
  );
  // El inventario es el recordatorio de contar la bodega: no lleva insumos.
  const acceptsInputs = activity.activity_type !== 'inventory';
  const rowErrors = Array.isArray(errors.inputs) ? errors.inputs : [];
  const errorCount =
    (errors.done_date ? 1 : 0) +
    rowErrors.reduce(
      (count: number, row) =>
        count + (row?.input_id ? 1 : 0) + (row?.quantity ? 1 : 0),
      0,
    );

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      {submitCount > 0 && !isValid && errorCount > 0 && (
        <p
          className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
          role="alert"
        >
          {errorCount === 1
            ? 'Revisa el dato marcado antes de guardar.'
            : `Revisa los ${errorCount} datos marcados antes de guardar.`}
        </p>
      )}
      <FormSection title="Fecha de realización">
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.done_date?.message}
          label="Fecha de realización"
          max={today}
          type="date"
          {...register('done_date')}
        />
      </FormSection>
      {acceptsInputs && (
        <FormSection title="Insumos utilizados">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si la labor no usó insumos, guárdala sin agregar ninguno.
            </p>
            {fields.length > 0 && catalog && (
              <ul className="space-y-4">
                {fields.map((field, index) => {
                  const row = rows?.[index] ?? field;
                  return (
                    <CompletionInputRow
                      catalog={catalog}
                      control={control}
                      disabled={isSaving}
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
                      takenIds={
                        new Set(
                          (rows ?? [])
                            .filter((_, other) => other !== index)
                            .map((other) => other.input_id)
                            .filter(Boolean),
                        )
                      }
                    />
                  );
                })}
              </ul>
            )}
            <Button
              aria-describedby={catalog ? undefined : 'completion-no-catalog'}
              className={CAPTURE_BUTTON_CLASS}
              disabled={isSaving || !catalog}
              onClick={() => append({ input_id: '', quantity: '' })}
              size="office"
              type="button"
              variant="outline"
            >
              <Plus aria-hidden="true" className="size-5" /> Agregar insumo
            </Button>
            {!catalog && (
              <p
                className="text-sm font-bold text-warn"
                id="completion-no-catalog"
              >
                {NO_CATALOG_MESSAGE}
              </p>
            )}
          </div>
        </FormSection>
      )}
      <div className="space-y-4">
        {error && (
          <p
            className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
            role="alert"
          >
            {error}
          </p>
        )}
        {blockedMessage && (
          <p className="font-bold text-warn" id="completion-save-blocked">
            {blockedMessage}
          </p>
        )}
        <MobileActionBar>
          <Button
            aria-describedby={
              blockedMessage ? 'completion-save-blocked' : undefined
            }
            className={CAPTURE_BUTTON_CLASS}
            disabled={isSaving || !!blockedMessage}
            size="office"
            type="submit"
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
          {secondaryAction}
        </MobileActionBar>
      </div>
    </form>
  );
}
