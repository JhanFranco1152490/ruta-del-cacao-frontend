import type { components } from '@/lib/api/schema';

export type ParameterValues = components['schemas']['DryingValues'];
export type ParameterKey = keyof ParameterValues;

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

// Los topes no vienen de la historia de usuario: atrapan un cero de más. Son los mismos del servidor.
export const MAX_DAYS = 60;
export const MAX_HOURS = 240;

// Los cuatro rangos: el mínimo no puede pasar del máximo.
export const RANGES = [
  ['entry_moisture_min_pct', 'entry_moisture_max_pct'],
  ['target_moisture_min_pct', 'target_moisture_max_pct'],
  ['estimated_days_min', 'estimated_days_max'],
  ['near_target_min_pct', 'near_target_max_pct'],
] as const satisfies readonly (readonly [ParameterKey, ParameterKey])[];

// Los 15, en el orden en que se muestran.
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
];

export type ParameterUnit = '%' | 'días' | 'horas';

const isIn = (list: readonly ParameterKey[], key: ParameterKey) =>
  list.includes(key);

export const unitOf = (key: ParameterKey): ParameterUnit =>
  isIn(DAY_KEYS, key) ? 'días' : isIn(HOUR_KEYS, key) ? 'horas' : '%';
