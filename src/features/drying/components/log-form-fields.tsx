'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';
import {
  Controller,
  type UseFormSetError,
  useForm,
  useWatch,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { FormMessage } from '@/components/form-message';
import { MobileActionBar } from '@/components/mobile-action-bar';
import { PageHeader } from '@/components/page-header';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
import { Button, buttonVariants } from '@/components/ui/button';
import { fromBogotaLocal, toBogotaLocal } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { isLocalDateTime, NOTES_MAX_LENGTH } from '@/lib/validation/moment';

import { availableHours, logDateOf } from '../drying-days';
import { DUPLICATE_ERROR } from '../log-errors';
import {
  createLogFormSchema,
  type LogFormInput,
  type LogFormValues,
  turnFrequencyVisible,
} from '../log-form';
import { WeatherPicker } from './weather-picker';

// Lo que se mide va en grande y centrado: se lee a un brazo de distancia, con el medidor en la otra
// mano.
const MEASURE_FIELD_CLASS = `${CAPTURE_FIELD_CLASS} text-center text-xl font-bold tabular-nums`;

// «Ese día el secado tuvo 10,5 horas», con la hora elegida: es el tope de las horas al sol y a la
// sombra. Vacío si la fecha todavía no es válida.
function hoursHint(localTime: string, startedAt: string) {
  if (!isLocalDateTime(localTime)) return undefined;
  const measuredAt = fromBogotaLocal(localTime);
  const available = availableHours(
    logDateOf(measuredAt),
    startedAt,
    new Date(),
  );
  return available > 0
    ? `Ese día el secado tuvo ${formatFixedDecimal(available, 1)} horas.`
    : undefined;
}

// La pantalla de campo de la bitácora: se llena junto a la marquesina, con el medidor de humedad en
// la mano. El título dice qué día de secado será según la fecha elegida.
export function LogFormFields({
  defaultValues,
  startedAt,
  heading,
  description,
  notices,
  submitLabel,
  isSaving,
  disabledMessage,
  formError,
  logsHref,
  cancelHref,
  onSubmit,
}: {
  defaultValues: LogFormInput;
  startedAt: string;
  // El título según la fecha que tiene el campo (`yyyy-MM-ddTHH:mm`, o vacío).
  heading: (localTime: string) => string;
  description: string;
  // Lo que va entre el título y los campos: la bitácora anterior, los avisos.
  notices?: ReactNode;
  submitLabel: string;
  isSaving: boolean;
  // Por qué no se puede guardar ahora (sin conexión al corregir, la sesión vencida).
  disabledMessage?: string | null;
  formError?: string;
  // La ficha del lote, con sus bitácoras.
  logsHref: string;
  cancelHref: string;
  onSubmit: (
    values: LogFormValues,
    setError: UseFormSetError<LogFormInput>,
  ) => void;
}) {
  const resolver = useMemo(
    () => zodResolver(createLogFormSchema({ startedAt })),
    [startedAt],
  );
  const { control, register, handleSubmit, setError, formState } = useForm<
    LogFormInput,
    unknown,
    LogFormValues
  >({ resolver, defaultValues });
  const { errors } = formState;
  const localTime = useWatch({ control, name: 'measured_at' });
  const turnCount = useWatch({ control, name: 'turn_count' });
  const withTurns = turnFrequencyVisible(turnCount);

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(event) =>
        void handleSubmit((values) => onSubmit(values, setError))(event)
      }
    >
      <PageHeader
        description={description}
        eyebrow="Secado"
        title={heading(localTime)}
      />
      {notices}
      {formError && <FormMessage>{formError}</FormMessage>}
      <div className="grid grid-cols-2 gap-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5">
        <div className="col-span-2 space-y-2">
          <TextField
            className={CAPTURE_FIELD_CLASS}
            disabled={isSaving}
            error={errors.measured_at?.message}
            label="Fecha y hora de la medición"
            max={toBogotaLocal(new Date().toISOString())}
            min={toBogotaLocal(startedAt)}
            type="datetime-local"
            {...register('measured_at')}
          />
          {errors.measured_at?.type === DUPLICATE_ERROR && (
            <Link className="font-bold underline" href={logsHref}>
              Ver la bitácora
            </Link>
          )}
        </div>
        <TextField
          className={MEASURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.moisture_pct?.message}
          hint="Humedad del grano."
          inputMode="decimal"
          label="Humedad (%)"
          wrapperClassName="col-span-2"
          {...register('moisture_pct')}
        />
        <TextField
          className={MEASURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.sun_hours?.message}
          hint={hoursHint(localTime, startedAt)}
          inputMode="decimal"
          label="Horas al sol"
          {...register('sun_hours')}
        />
        <TextField
          className={MEASURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.shade_hours?.message}
          inputMode="decimal"
          label="Horas a la sombra (opcional)"
          {...register('shade_hours')}
        />
        <TextField
          className={MEASURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.turn_count?.message}
          inputMode="numeric"
          label="Volteos del día"
          wrapperClassName={withTurns ? undefined : 'col-span-2'}
          {...register('turn_count')}
        />
        {withTurns && (
          <TextField
            className={MEASURE_FIELD_CLASS}
            disabled={isSaving}
            error={errors.turn_frequency_hours?.message}
            hint="Cada cuántas horas."
            inputMode="decimal"
            label="Frecuencia (h)"
            {...register('turn_frequency_hours')}
          />
        )}
        <div className="col-span-2">
          <Controller
            control={control}
            name="weather"
            render={({ field }) => (
              <WeatherPicker
                disabled={isSaving}
                error={errors.weather?.message}
                onBlur={field.onBlur}
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </div>
        <TextAreaField
          className="min-h-16"
          disabled={isSaving}
          error={errors.notes?.message}
          label="Observaciones (opcional)"
          placeholder={`Hasta ${NOTES_MAX_LENGTH} caracteres`}
          rows={2}
          wrapperClassName="col-span-2"
          {...register('notes')}
        />
      </div>
      <div className="space-y-4">
        {disabledMessage && (
          <p className="font-bold text-warn" id="log-save-blocked">
            {disabledMessage}
          </p>
        )}
        <MobileActionBar>
          <Button
            aria-describedby={disabledMessage ? 'log-save-blocked' : undefined}
            className="w-full sm:w-auto"
            disabled={isSaving || !!disabledMessage}
            size="field"
            type="submit"
          >
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
          <Link
            className={buttonVariants({
              size: 'field',
              variant: 'outline',
              className: 'w-full sm:w-auto',
            })}
            href={cancelHref}
          >
            Cancelar
          </Link>
        </MobileActionBar>
      </div>
    </form>
  );
}
