'use client';

import Link from 'next/link';
import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
import { fromBogotaLocal, toBogotaLocal } from '@/lib/format/dates';
import { hoursBetween } from '@/lib/format/hours';
import { isLocalDateTime, NOTES_MAX_LENGTH } from '@/lib/validation/moment';

import { dayNumberOf } from '../drying-days';
import { rangeText } from '../moisture';
import { DUPLICATE_ERROR } from '../log-errors';
import type { LogFormInput } from '../log-form';
import { WeatherPicker } from './weather-picker';

// Lo que se mide va en grande y centrado: se lee a un brazo de distancia, con el medidor en la otra
// mano.
const MEASURE_FIELD_CLASS = `${CAPTURE_FIELD_CLASS} text-center text-xl font-bold tabular-nums`;

// «Día 3 de secado · 52 h desde el inicio», con la fecha elegida. Vacío si todavía no es válida o es
// anterior al inicio.
function dayHint(localTime: string, startedAt: string) {
  if (!isLocalDateTime(localTime)) return undefined;
  const measuredAt = fromBogotaLocal(localTime);
  const hours = hoursBetween(startedAt, measuredAt);
  if (hours < 0) return undefined;
  return `Día ${dayNumberOf(startedAt, measuredAt)} de secado · ${Math.floor(hours)} h desde el inicio`;
}

// Los campos de la bitácora juntos en una tarjeta, con las medidas lado a lado también en celular:
// la pantalla se llena de pie junto a la marquesina y así cabe sin desplazarse tanto.
export function LogFields({
  control,
  register,
  errors,
  isSaving,
  startedAt,
  targetMoisture,
  localTime,
  withTurns,
  logsHref,
}: {
  control: Control<LogFormInput, unknown, LogFormInput>;
  register: UseFormRegister<LogFormInput>;
  errors: FieldErrors<LogFormInput>;
  isSaving: boolean;
  startedAt: string;
  // La meta de humedad del productor, como referencia al medir.
  targetMoisture: { min: string; max: string };
  // La fecha que tiene el campo (`yyyy-MM-ddTHH:mm`, o vacío).
  localTime: string;
  // Hubo volteos: se pide cada cuántas horas.
  withTurns: boolean;
  // La ficha del lote, con sus bitácoras.
  logsHref: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5">
      <div className="col-span-2 space-y-2">
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={isSaving}
          error={errors.measured_at?.message}
          hint={dayHint(localTime, startedAt)}
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
        hint={`Meta: ${rangeText(targetMoisture)}`}
        inputMode="decimal"
        label="Humedad (%)"
        wrapperClassName="col-span-2"
        {...register('moisture_pct')}
      />
      <TextField
        className={MEASURE_FIELD_CLASS}
        disabled={isSaving}
        error={errors.sun_hours?.message}
        hint="Si estuvo nublado o llovió todo el día, escribe 0."
        inputMode="decimal"
        label="Horas al sol"
        {...register('sun_hours')}
      />
      <TextField
        className={MEASURE_FIELD_CLASS}
        disabled={isSaving}
        error={errors.shade_hours?.message}
        hint="Las horas que el grano estuvo cubierto o guardado."
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
  );
}
