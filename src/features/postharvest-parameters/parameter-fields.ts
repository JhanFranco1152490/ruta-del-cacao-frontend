import type { components } from '@/lib/api/schema';

export type ParameterValues = components['schemas']['PostharvestValues'];
export type ParameterKey = Extract<keyof ParameterValues, string>;

// Lo que escribe quien edita: todo como texto, con coma o con punto.
export type ParametersFormInput = Record<ParameterKey, string>;

export const PERCENT_KEYS = [
  'entry_moisture_min_pct',
  'entry_moisture_max_pct',
  'target_moisture_min_pct',
  'target_moisture_max_pct',
  'slow_stall_min_drop_pct',
  'slow_duration_moisture_pct',
  'accelerated_moisture_pct',
  'near_target_min_pct',
  'near_target_max_pct',
  'overdried_moisture_pct',
] as const satisfies readonly ParameterKey[];

export const DAY_KEYS = [
  'estimated_days_min',
  'estimated_days_max',
  'slow_duration_day',
  'accelerated_day',
] as const satisfies readonly ParameterKey[];

export const HOUR_KEYS = [
  'slow_stall_window_hours',
] as const satisfies readonly ParameterKey[];

export const FERMENTATION_KEYS = [
  'first_turn_hours',
  'next_turn_hours',
  'temperature_min_c',
  'temperature_max_c',
  'ph_min',
  'ph_max',
] as const satisfies readonly ParameterKey[];

// Las horas que espera un volteo de la fermentación.
export const TURN_HOUR_KEYS = [
  'first_turn_hours',
  'next_turn_hours',
] as const satisfies readonly ParameterKey[];

export const TEMPERATURE_KEYS = [
  'temperature_min_c',
  'temperature_max_c',
] as const satisfies readonly ParameterKey[];

export const PH_KEYS = [
  'ph_min',
  'ph_max',
] as const satisfies readonly ParameterKey[];

// Los topes no vienen de la historia de usuario: atrapan un cero de más. Son los mismos del servidor.
export const MAX_DAYS = 60;
export const MAX_HOURS = 240;
// La temperatura y el pH tienen los mismos límites que un volteo.
export const MAX_TEMPERATURE = 80;
export const MAX_PH = 14;

// Los cuatro rangos: el mínimo no puede pasar del máximo.
export const RANGES = [
  ['entry_moisture_min_pct', 'entry_moisture_max_pct'],
  ['target_moisture_min_pct', 'target_moisture_max_pct'],
  ['estimated_days_min', 'estimated_days_max'],
  ['near_target_min_pct', 'near_target_max_pct'],
  ['temperature_min_c', 'temperature_max_c'],
  ['ph_min', 'ph_max'],
] as const satisfies readonly (readonly [ParameterKey, ParameterKey])[];

// Los 21, en el orden en que se muestran.
export const PARAMETER_KEYS: readonly ParameterKey[] = [
  'entry_moisture_min_pct',
  'entry_moisture_max_pct',
  'target_moisture_min_pct',
  'target_moisture_max_pct',
  'estimated_days_min',
  'estimated_days_max',
  'slow_stall_min_drop_pct',
  'slow_stall_window_hours',
  'slow_duration_day',
  'slow_duration_moisture_pct',
  'accelerated_day',
  'accelerated_moisture_pct',
  'near_target_min_pct',
  'near_target_max_pct',
  'overdried_moisture_pct',
  'first_turn_hours',
  'next_turn_hours',
  'temperature_min_c',
  'temperature_max_c',
  'ph_min',
  'ph_max',
];

// Los valores predeterminados de fermentación. El servidor los entrega siempre con la línea base; esta
// copia solo completa una respuesta o una copia del dispositivo anterior a los parámetros de
// fermentación, para que la pantalla no muestre «undefined» ni «NaN».
export const FERMENTATION_DEFAULTS: Pick<
  ParameterValues,
  (typeof FERMENTATION_KEYS)[number]
> = {
  first_turn_hours: 48,
  next_turn_hours: 24,
  temperature_min_c: '40.0',
  temperature_max_c: '50.0',
  ph_min: '4.00',
  ph_max: '5.50',
};

export type ParameterUnit = '%' | 'días' | 'horas' | '°C' | 'pH';

const isIn = (list: readonly ParameterKey[], key: ParameterKey) =>
  list.includes(key);

export const unitOf = (key: ParameterKey): ParameterUnit => {
  if (isIn(DAY_KEYS, key)) return 'días';
  if (isIn(HOUR_KEYS, key) || isIn(TURN_HOUR_KEYS, key)) return 'horas';
  if (isIn(TEMPERATURE_KEYS, key)) return '°C';
  return isIn(PH_KEYS, key) ? 'pH' : '%';
};

// Cuántos decimales lleva cada valor al mostrarse: la temperatura, uno; el pH, dos; el porcentaje,
// los que traiga (55 % y 6,5 %).
export const FIXED_DECIMALS: Partial<Record<ParameterUnit, number>> = {
  '°C': 1,
  pH: 2,
};
