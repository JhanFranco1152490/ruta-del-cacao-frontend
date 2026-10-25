import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { formatTime, fromBogotaLocal } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { minuteOf } from '@/lib/format/hours';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import {
  FUTURE_MOMENT_MESSAGE,
  isLocalDateTime,
  NOTES_MAX_LENGTH,
  NOTES_TOO_LONG_MESSAGE,
} from '@/lib/validation/moment';

import type { Weather } from './api';
import { availableHours, logDateOf } from './drying-days';

type Schemas = components['schemas'];

// Los mismos topes y decimales que guarda el servidor.
export const MAX_PERCENT = 100;
export const MAX_DAY_HOURS = 24;
export const MIN_TURN_FREQUENCY_HOURS = 0.5;
export const MAX_TURNS_PER_DAY = 48;

export const PERCENT_MESSAGE = 'Debe estar entre 0 % y 100 %.';
export const DAY_HOURS_MESSAGE = 'Debe estar entre 0 y 24 horas.';
export const FREQUENCY_MESSAGE = 'Debe estar entre 0,5 y 24 horas.';
export const FREQUENCY_REQUIRED_MESSAGE =
  'Indica cada cuántas horas se volteó.';
export const BEFORE_START_MESSAGE =
  'No puede ser anterior al inicio del secado.';
export const ONE_DECIMAL_MESSAGE = 'Usa máximo 1 decimal.';

export const WEATHERS: readonly { value: Weather; label: string }[] = [
  { value: 'sunny', label: 'Soleado' },
  { value: 'partly_cloudy', label: 'Parcialmente nublado' },
  { value: 'cloudy', label: 'Nublado' },
  { value: 'rainy', label: 'Lluvioso' },
];

// La hora de la medición es la de un campo de fecha y hora (yyyy-MM-ddTHH:mm), en la hora de
// Bogotá. Los números van como texto, como los escribe quien registra.
export type LogFormInput = {
  measured_at: string;
  moisture_pct: string;
  sun_hours: string;
  shade_hours: string;
  turn_count: string;
  turn_frequency_hours: string;
  weather: string;
  notes: string;
};

// Los decimales con punto («12.4»), como los espera la API.
export type LogFormValues = LogFormInput;

const issueOn = (context: z.RefinementCtx) => (message: string) =>
  context.addIssue({ code: 'custom', message });

export const percentField = decimalText().superRefine((text, context) => {
  const issue = issueOn(context);
  if (!text) return issue(REQUIRED_FIELD_MESSAGE);
  if (!isDecimal(text) || Number(text) < 0 || Number(text) > MAX_PERCENT) {
    return issue(PERCENT_MESSAGE);
  }
  if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
});

const dayHoursField = (required: boolean) =>
  decimalText().superRefine((text, context) => {
    const issue = issueOn(context);
    if (!text) return required ? issue(REQUIRED_FIELD_MESSAGE) : undefined;
    if (!isDecimal(text) || Number(text) < 0 || Number(text) > MAX_DAY_HOURS) {
      return issue(DAY_HOURS_MESSAGE);
    }
    if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
  });

const turnCountField = z
  .string()
  .trim()
  .superRefine((text, context) => {
    const issue = issueOn(context);
    if (!text) return issue(REQUIRED_FIELD_MESSAGE);
    if (/^-\d+$/.test(text)) return issue('No puede ser negativo.');
    if (!/^\d+$/.test(text)) return issue('Debe ser un número entero.');
    if (Number(text) > MAX_TURNS_PER_DAY) {
      issue(`Revisa la cifra: no más de ${MAX_TURNS_PER_DAY} volteos al día.`);
    }
  });

const frequencyField = decimalText().superRefine((text, context) => {
  const issue = issueOn(context);
  if (!text) return;
  const hours = Number(text);
  if (
    !isDecimal(text) ||
    hours < MIN_TURN_FREQUENCY_HOURS ||
    hours > MAX_DAY_HOURS
  ) {
    return issue(FREQUENCY_MESSAGE);
  }
  if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
});

const isWeather = (value: string): value is Weather =>
  WEATHERS.some((weather) => weather.value === value);

// Las horas de ese día que tuvo el secado, dichas como el servidor: el día del inicio cuenta desde
// la hora de inicio.
export function hoursMessage(
  available: number,
  startedAt: string,
  logDate: string,
) {
  const hours = `${formatFixedDecimal(available, 1)} horas`;
  return logDateOf(startedAt) === logDate
    ? `Ese día el secado tuvo ${hours} (empezó a las ${formatTime(startedAt)}).`
    : `Ese día el secado tuvo ${hours}.`;
}

// La medición cae entre el inicio y ahora, y las horas al sol más las de sombra no pasan de las que
// tuvo ese día el secado. `now` se recibe para poder probarlo.
export function createLogFormSchema({
  startedAt,
  now = () => new Date(),
}: {
  startedAt: string;
  now?: () => Date;
}) {
  return z
    .object({
      measured_at: z.string().superRefine((local, context) => {
        const issue = issueOn(context);
        if (!isLocalDateTime(local)) return issue(REQUIRED_FIELD_MESSAGE);
        const minute = minuteOf(fromBogotaLocal(local));
        if (minute < minuteOf(startedAt)) return issue(BEFORE_START_MESSAGE);
        if (minute > minuteOf(now())) issue(FUTURE_MOMENT_MESSAGE);
      }),
      moisture_pct: percentField,
      sun_hours: dayHoursField(true),
      shade_hours: dayHoursField(false),
      turn_count: turnCountField,
      turn_frequency_hours: frequencyField,
      weather: z.string().refine(isWeather, REQUIRED_FIELD_MESSAGE),
      notes: z.string().trim().max(NOTES_MAX_LENGTH, NOTES_TOO_LONG_MESSAGE),
    })
    .superRefine((values, context) => {
      if (Number(values.turn_count) > 0 && !values.turn_frequency_hours) {
        context.addIssue({
          code: 'custom',
          message: FREQUENCY_REQUIRED_MESSAGE,
          path: ['turn_frequency_hours'],
        });
      }
      // Las horas del día solo se comparan cuando lo demás está bien escrito: con una fecha o unas
      // horas inválidas ya hay un error en su campo.
      if (!isLocalDateTime(values.measured_at)) return;
      const measuredAt = fromBogotaLocal(values.measured_at);
      const minute = minuteOf(measuredAt);
      if (minute < minuteOf(startedAt) || minute > minuteOf(now())) return;
      const hours = [values.sun_hours, values.shade_hours || '0'];
      if (
        hours.some((text) => !isDecimal(text) || Number(text) > MAX_DAY_HOURS)
      ) {
        return;
      }
      const logDate = logDateOf(measuredAt);
      const available = availableHours(logDate, startedAt, now());
      const used = hours.reduce((sum, text) => sum + Number(text), 0);
      if (used > available) {
        context.addIssue({
          code: 'custom',
          message: hoursMessage(available, startedAt, logDate),
          path: ['sun_hours'],
        });
      }
    });
}

// Con volteos hay que decir cada cuántas horas; sin ellos, la frecuencia se oculta y no se envía.
export const turnFrequencyVisible = (turnCount: string) =>
  Number(turnCount) > 0;

// El id lo genera el dispositivo, para que un reenvío desde la cola no registre la bitácora dos
// veces. `capturedAt` es la hora del dispositivo al guardar.
export const toLogCreateRequest = (
  values: LogFormValues,
  { id, capturedAt }: { id: string; capturedAt: string },
): Schemas['DryingLogCreateRequest'] => ({
  id,
  measured_at: fromBogotaLocal(values.measured_at),
  moisture_pct: values.moisture_pct,
  sun_hours: values.sun_hours,
  shade_hours: values.shade_hours || null,
  turn_count: Number(values.turn_count),
  turn_frequency_hours: turnFrequencyVisible(values.turn_count)
    ? values.turn_frequency_hours
    : null,
  weather: values.weather as Weather,
  notes: values.notes,
  captured_at: capturedAt,
});
