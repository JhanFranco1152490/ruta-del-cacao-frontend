'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { UsedInputsSection } from '@/components/input-usage/used-inputs-section';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/form-message';
import type { CatalogInput } from '@/lib/input-usage';

import type { AgriculturalActivity } from '../api';
import {
  type CompletionFormInput,
  type CompletionFormValues,
  createCompletionSchema,
} from '../completion-rules';

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
  summary,
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
  // La actividad que se registra, a la izquierda de la fecha.
  summary?: ReactNode;
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
        <FormMessage>
          {errorCount === 1
            ? 'Revisa el dato marcado antes de guardar.'
            : `Revisa los ${errorCount} datos marcados antes de guardar.`}
        </FormMessage>
      )}
      {/* La actividad y la fecha, lado a lado: son dos tarjetas de poco contenido y apiladas
          dejaban media pantalla vacía. */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {summary}
        <FormSection compact title="Fecha de realización">
          <TextField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving}
            error={errors.done_date?.message}
            hideLabel
            label="Fecha de realización"
            max={today}
            type="date"
            {...register('done_date')}
          />
        </FormSection>
      </div>
      {acceptsInputs && (
        <UsedInputsSection
          catalog={catalog}
          control={control}
          disabled={isSaving}
          hint="Si la labor no usó insumos, guárdala sin agregar ninguno."
          name="inputs"
          stocks={stocks}
          unavailableRows={unavailableRows}
        />
      )}
      <div className="space-y-4">
        {error && <FormMessage>{error}</FormMessage>}
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
