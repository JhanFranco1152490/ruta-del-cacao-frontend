import type { components } from '@/lib/api/schema';

type NotificationKind = components['schemas']['NotificationKindEnum'];

// El nombre de cada aviso de poscosecha, el mismo en la bandeja y en el aviso al guardar. Los dos
// secados lentos (por estancamiento y por duración) se llaman igual: el riesgo es el mismo.
export const POSTHARVEST_ALERT_TITLES = {
  fermentation_first_turn_due: 'Se acerca el primer volteo',
  fermentation_turn_due: 'Volteo pendiente',
  drying_log_due: 'Bitácora de secado pendiente',
  fermentation_temperature_low: 'Temperatura por debajo del rango',
  fermentation_temperature_high: 'Temperatura por encima del rango',
  fermentation_ph_low: 'Grano demasiado ácido',
  fermentation_ph_high: 'La fermentación no avanza',
  drying_slow_stalled: 'Secado lento – riesgo de hongo',
  drying_slow_duration: 'Secado lento – riesgo de hongo',
  drying_accelerated: 'Secado acelerado – riesgo de daño físico',
  drying_near_target: 'Próximo a meta – preparar ensacado',
  drying_overdried: 'Sobresecado',
} as const satisfies Partial<Record<NotificationKind, string>>;

export type PostharvestAlertKind = keyof typeof POSTHARVEST_ALERT_TITLES;

export const isPostharvestAlertKind = (
  kind: string,
): kind is PostharvestAlertKind =>
  Object.hasOwn(POSTHARVEST_ALERT_TITLES, kind);
