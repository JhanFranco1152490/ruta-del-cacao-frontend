'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactNode, useCallback, useEffect } from 'react';
import { Controller, type Resolver, useForm, useWatch } from 'react-hook-form';

import {
  CAPTURE_BUTTON_CLASS,
  CAPTURE_FIELD_CLASS,
} from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { CollectorOption } from '../api';
import type { HarvestPlotChoice } from '../harvest-plots';
import { createHarvestSchema, varietyLabel } from '../harvest-rules';
import {
  collectorChoices,
  type HarvestFormInput,
  onlyVariety,
} from '../harvest-values';
import { HarvestPlotField } from './harvest-plot-field';

const ESTABLISHMENT_WARNING =
  'Esta variedad figura en Establecimiento en la ficha de la parcela. Si ya produce, conviene actualizar la ficha.';

// Lo que se registra de una recolección. La validación depende de la parcela elegida (su área
// para el tope de peso y sus variedades), así que el esquema se arma con ella en cada envío.
export function HarvestForm({
  plots,
  truncated,
  collectors,
  preferredCollectorId,
  today,
  defaultValues,
  plotLocked = false,
  isSaving,
  submitLabel,
  blockedMessage,
  onPlotChange,
  onSubmit,
  secondaryAction,
}: {
  plots: readonly HarvestPlotChoice[];
  truncated: boolean;
  // Quienes pueden recolectar, de toda la cuenta; se ofrecen los de la finca de la parcela.
  collectors: readonly CollectorOption[] | undefined;
  // Quien registra: se propone como recolector en las parcelas donde puede serlo.
  preferredCollectorId?: string;
  today: string;
  defaultValues: HarvestFormInput;
  // Al corregir lo que el servidor rechazó, la parcela ya no se cambia.
  plotLocked?: boolean;
  isSaving: boolean;
  submitLabel: string;
  blockedMessage?: string | null;
  onPlotChange?: (plot: HarvestPlotChoice | undefined) => void;
  onSubmit: (values: HarvestFormInput) => void;
  secondaryAction?: ReactNode;
}) {
  const resolver = useCallback<Resolver<HarvestFormInput>>(
    (values, context, options) => {
      const plot = plots.find(({ id }) => id === values.plot_id);
      const schema = createHarvestSchema({
        today,
        areaHectares: plot?.areaHectares ?? '0',
        varieties: plot?.varieties ?? [],
      });
      return zodResolver(schema)(values, context, options);
    },
    [plots, today],
  );
  const { control, register, setValue, getValues, handleSubmit, formState } =
    useForm<HarvestFormInput>({ resolver, defaultValues });
  const { errors } = formState;
  const [plotId, varietyId] = useWatch({
    control,
    name: ['plot_id', 'variety_id'],
  });
  const plot = plots.find(({ id }) => id === plotId);
  const variety = plot?.varieties.find(({ id }) => id === varietyId);
  const people =
    plot && collectors ? collectorChoices(collectors, plot.farmId) : [];
  // La lista de recolectores puede llegar después de la parcela (abierta desde ella o recordada):
  // entonces se propone a quien registra, si puede serlo y nadie está elegido aún.
  const proposeCollector =
    !!preferredCollectorId &&
    people.some(({ id }) => id === preferredCollectorId);
  useEffect(() => {
    if (proposeCollector && !getValues('collector_id')) {
      setValue('collector_id', preferredCollectorId!);
    }
  }, [proposeCollector, preferredCollectorId, getValues, setValue]);

  // Otra parcela trae otras variedades y otra gente: lo elegido que ya no vale se quita.
  const choosePlot = (id: string) => {
    const next = plots.find((choice) => choice.id === id);
    setValue('plot_id', id, { shouldValidate: formState.isSubmitted });
    const keptVariety = next?.varieties.some(
      ({ id: varietyOf }) => varietyOf === getValues('variety_id'),
    );
    if (!keptVariety)
      setValue('variety_id', next ? onlyVariety(next.varieties) : '');
    const offered =
      next && collectors ? collectorChoices(collectors, next.farmId) : [];
    const offers = (person: string | undefined) =>
      offered.some(({ id: offeredId }) => offeredId === person);
    if (!offers(getValues('collector_id'))) {
      setValue(
        'collector_id',
        offers(preferredCollectorId) ? preferredCollectorId! : '',
      );
    }
    onPlotChange?.(next);
  };

  return (
    <form
      className="space-y-6"
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
    >
      <FormSection title="Recolección">
        <div className="grid gap-5">
          <Controller
            control={control}
            name="plot_id"
            render={({ field }) => (
              <HarvestPlotField
                disabled={isSaving || plotLocked}
                error={errors.plot_id?.message}
                onBlur={field.onBlur}
                onChange={choosePlot}
                plots={plots}
                truncated={truncated}
                value={field.value}
              />
            )}
          />
          <SelectField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving || !plot}
            error={errors.variety_id?.message}
            hint={
              variety?.onlyEstablishment ? ESTABLISHMENT_WARNING : undefined
            }
            label="Variedad cosechada"
            {...register('variety_id')}
          >
            <option disabled value="">
              {plot ? 'Elige la variedad' : 'Primero elige la parcela'}
            </option>
            {plot?.varieties.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {varietyLabel(choice)}
              </option>
            ))}
          </SelectField>
          <TextField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving}
            error={errors.harvest_date?.message}
            label="Fecha de recolección"
            max={today}
            type="date"
            {...register('harvest_date')}
          />
          <TextField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving}
            error={errors.green_weight_kg?.message}
            hint="Cacao en baba, en kilogramos, con un decimal como máximo."
            inputMode="decimal"
            label="Peso en verde (kg)"
            {...register('green_weight_kg')}
          />
          <SelectField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving || !plot}
            error={errors.collector_id?.message}
            label="Recolector"
            {...register('collector_id')}
          >
            <option disabled value="">
              {plot ? 'Elige quién recolectó' : 'Primero elige la parcela'}
            </option>
            {people.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>
      </FormSection>
      <div className="space-y-4">
        {blockedMessage && (
          <p className="font-bold text-warn" id="harvest-save-blocked">
            {blockedMessage}
          </p>
        )}
        <MobileActionBar>
          <Button
            aria-describedby={
              blockedMessage ? 'harvest-save-blocked' : undefined
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
