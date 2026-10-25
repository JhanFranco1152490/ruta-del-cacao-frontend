import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { formatShortDayMonth } from '@/lib/format/dates';
import { formatDecimal, formatFixedDecimal } from '@/lib/format/decimal';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { percentField } from '@/lib/validation/percent';

import {
  FIXED_DECIMALS,
  HOUR_KEYS,
  MAX_DAYS,
  MAX_HOURS,
  MAX_PH,
  MAX_TEMPERATURE,
  PARAMETER_KEYS,
  type ParameterKey,
  type ParametersFormInput,
  type ParameterValues,
  PERCENT_KEYS,
  PH_KEYS,
  RANGES,
  TEMPERATURE_KEYS,
  TURN_HOUR_KEYS,
  unitOf,
} from './parameter-fields';

type Schemas = components['schemas'];

export const POSITIVE_INTEGER_MESSAGE =
  'Debe ser un número entero mayor que cero.';
export const MAX_DAYS_MESSAGE = `Revisa la cifra: un secado no pasa de ${MAX_DAYS} días.`;
export const MAX_HOURS_MESSAGE = `Revisa la cifra: la ventana no pasa de ${MAX_HOURS} horas.`;
export const MIN_ABOVE_MAX_MESSAGE =
  'El mínimo no puede ser mayor que el máximo';
export const POSITIVE_DROP_MESSAGE = 'Debe ser mayor que cero.';
export const MAX_TURN_HOURS_MESSAGE = `Revisa la cifra: un volteo no se espera pasadas ${MAX_HOURS} horas.`;
export const TEMPERATURE_MESSAGE = `Debe estar entre 0 °C y ${MAX_TEMPERATURE} °C.`;
export const PH_MESSAGE = `Debe estar entre 0 y ${MAX_PH}.`;
export const ONE_DECIMAL_MESSAGE = 'Usa máximo 1 decimal.';
export const TWO_DECIMALS_MESSAGE = 'Usa máximo 2 decimales.';

// Días u horas: enteros, mayores que cero y bajo su tope.
const wholeNumberField = (max: number, maxMessage: string) =>
  z
    .string()
    .trim()
    .superRefine((text, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!text) return issue(REQUIRED_FIELD_MESSAGE);
      if (!/^\d+$/.test(text) || Number(text) < 1) {
        return issue(POSITIVE_INTEGER_MESSAGE);
      }
      if (Number(text) > max) issue(maxMessage);
    })
    .transform((text) => (text === '' ? Number.NaN : Number(text)));

// Un decimal obligatorio entre 0 y su tope, con los decimales que guarda el servidor.
const boundedDecimalField = (
  max: number,
  places: number,
  rangeMessage: string,
  placesMessage: string,
) =>
  decimalText().superRefine((text, context) => {
    const issue = (message: string) =>
      context.addIssue({ code: 'custom', message });
    if (!text) return issue(REQUIRED_FIELD_MESSAGE);
    if (!isDecimal(text) || Number(text) < 0 || Number(text) > max) {
      return issue(rangeMessage);
    }
    if (!decimalPattern(places).test(text)) issue(placesMessage);
  });

const temperatureField = boundedDecimalField(
  MAX_TEMPERATURE,
  1,
  TEMPERATURE_MESSAGE,
  ONE_DECIMAL_MESSAGE,
);
const phField = boundedDecimalField(
  MAX_PH,
  2,
  PH_MESSAGE,
  TWO_DECIMALS_MESSAGE,
);

const includes = (keys: readonly string[], key: string) => keys.includes(key);

// Lo que baja la humedad es un porcentaje que además debe ser mayor que cero.
const dropField = percentField.refine(
  (text) => !isDecimal(text) || Number(text) > 0,
  POSITIVE_DROP_MESSAGE,
);

const FIELD_SCHEMAS: Record<
  ParameterKey,
  z.ZodType<unknown, string>
> = Object.fromEntries(
  PARAMETER_KEYS.map((key) => {
    if (key === 'slow_stall_min_drop_pct') return [key, dropField];
    if (includes(PERCENT_KEYS, key)) return [key, percentField];
    if (includes(TEMPERATURE_KEYS, key)) return [key, temperatureField];
    if (includes(PH_KEYS, key)) return [key, phField];
    if (includes(TURN_HOUR_KEYS, key)) {
      return [key, wholeNumberField(MAX_HOURS, MAX_TURN_HOURS_MESSAGE)];
    }
    return includes(HOUR_KEYS, key)
      ? [key, wholeNumberField(MAX_HOURS, MAX_HOURS_MESSAGE)]
      : [key, wholeNumberField(MAX_DAYS, MAX_DAYS_MESSAGE)];
  }),
) as Record<ParameterKey, z.ZodType<unknown, string>>;

// El valor de un campo ya revisado, o NaN si está vacío o mal escrito.
const numericValue = (value: unknown) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value !== ''
      ? Number(value)
      : Number.NaN;

// Los 21 valores, con las mismas reglas que la API. El mínimo de cada rango no pasa del máximo; eso
// solo se compara cuando los dos campos están bien escritos.
export const parametersSchema = z
  .object(FIELD_SCHEMAS)
  .superRefine((values, context) => {
    const parsed = values as Record<string, unknown>;
    for (const [min, max] of RANGES) {
      const low = numericValue(parsed[min]);
      const high = numericValue(parsed[max]);
      if (low > high) {
        context.addIssue({
          code: 'custom',
          message: MIN_ABOVE_MAX_MESSAGE,
          path: [min],
        });
      }
    }
  });

// La API escribe los decimales con punto; el formulario, con la coma del español.
export const parametersFormOf = (
  values: ParameterValues,
): ParametersFormInput =>
  Object.fromEntries(
    PARAMETER_KEYS.map((key) => [key, String(values[key]).replace('.', ',')]),
  ) as ParametersFormInput;

// Lo que se envía: los porcentajes como texto con punto, y los días y las horas como enteros.
export function toParameterValues(
  form: ParametersFormInput,
): Schemas['PostharvestValuesInputRequest'] {
  return Object.fromEntries(
    PARAMETER_KEYS.map((key) => {
      const text = decimalText().parse(form[key]);
      const whole = ['días', 'horas'].includes(unitOf(key));
      return [key, whole ? Number(text) : text];
    }),
  ) as Schemas['PostharvestValuesInputRequest'];
}

const sameNumber = (a: string, b: string) =>
  Number(decimalText().parse(a)) === Number(decimalText().parse(b));

// Los parámetros que no son los de la línea base: llevan la marca «Cambiado».
export const changedKeys = (
  form: ParametersFormInput,
  baseline: ParameterValues,
): ParameterKey[] =>
  PARAMETER_KEYS.filter((key) => !sameNumber(form[key], String(baseline[key])));

// Hay cambios sin guardar cuando algún campo difiere de lo cargado.
export const hasUnsavedChanges = (
  form: ParametersFormInput,
  loaded: ParametersFormInput,
) => PARAMETER_KEYS.some((key) => !sameNumber(form[key], loaded[key]));

// Un valor con su unidad, como se lee en la pantalla: «55 %», «6,5 %», «5 días», «40,0 °C» y el pH
// con sus dos decimales («4,00»).
export function valueText(key: ParameterKey, value: string | number) {
  const unit = unitOf(key);
  const fixed = FIXED_DECIMALS[unit];
  const text =
    fixed === undefined
      ? formatDecimal(value, 1)
      : formatFixedDecimal(value, fixed);
  return unit === 'pH' ? text : `${text} ${unit}`;
}

// «Línea base: 55 %», «Línea base: 5 días».
export const baselineText = (key: ParameterKey, baseline: ParameterValues) =>
  `Línea base: ${valueText(key, baseline[key])}`;

// De dónde salen los valores: la línea base o lo que cambió alguien, con la fecha y quién.
export function originLine(parameters: {
  is_default: boolean;
  updated_at: string | null;
  updated_by: { full_name: string } | null;
}) {
  if (parameters.is_default || !parameters.updated_at) {
    return 'Usas la línea base.';
  }
  const when = formatShortDayMonth(parameters.updated_at);
  const who = parameters.updated_by
    ? ` por ${parameters.updated_by.full_name}`
    : '';
  return `Personalizados · actualizados el ${when}${who}.`;
}

export const SCOPE_LINE =
  'Se aplican a todas tus fincas y a los lotes que ya están en secado, desde el siguiente registro.';
export const READ_ONLY_LINE =
  'Solo el productor y quien él autorice pueden cambiar estos valores.';
