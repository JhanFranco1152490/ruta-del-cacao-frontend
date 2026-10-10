import type { ActivityState, ActivityType } from './activity-state';

type Option<T extends string> = { value: T; label: string };

// En el orden en que se ofrecen en el formulario.
export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'pruning', label: 'Poda' },
  { value: 'fertilization', label: 'Fertilización' },
  { value: 'irrigation', label: 'Riego' },
  { value: 'weed_control', label: 'Control de malezas' },
  { value: 'phytosanitary_monitoring', label: 'Monitoreo fitosanitario' },
  { value: 'phytosanitary_control', label: 'Control fitosanitario' },
  { value: 'cleaning_or_liming', label: 'Limpieza o encalado' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'other', label: 'Otro' },
] as const satisfies readonly Option<ActivityType>[];

// Un control fitosanitario no se programa suelto: nace de la detección de un monitoreo.
export const SCHEDULABLE_ACTIVITY_TYPE_OPTIONS = ACTIVITY_TYPE_OPTIONS.filter(
  ({ value }) => value !== 'phytosanitary_control',
);

// Un tipo que esta versión de la app no conoce se muestra tal como llega, en vez de esconderlo.
export const activityTypeLabel = (type: string) =>
  ACTIVITY_TYPE_OPTIONS.find(({ value }) => value === type)?.label ?? type;

// Cómo se nombra la labor: una de tipo Otro se conoce por lo que la persona escribió.
export const activityTitle = (activity: {
  activity_type: string;
  other_description: string | null;
}) =>
  (activity.activity_type === 'other' && activity.other_description) ||
  activityTypeLabel(activity.activity_type);

// Etiqueta y tono de cada estado. El tono trae su ícono: el estado nunca se dice solo con color.
// La retrasada es un aviso (todavía se puede reprogramar) y la vencida, un problema.
export const ACTIVITY_STATE_DISPLAY = {
  scheduled: { label: 'Programada', tone: 'info' },
  delayed: { label: 'Retrasada', tone: 'warn' },
  overdue: { label: 'Vencida', tone: 'err' },
  done: { label: 'Realizada', tone: 'ok' },
} as const satisfies Record<
  ActivityState,
  { label: string; tone: 'ok' | 'warn' | 'err' | 'info' }
>;

// "Retrasada · 1 día", "Vencida · 5 días": el retraso se dice junto al estado.
export function activityStateText(state: ActivityState, daysLate: number) {
  const { label } = ACTIVITY_STATE_DISPLAY[state];
  if (daysLate <= 0) return label;
  return `${label} · ${daysLate} ${daysLate === 1 ? 'día' : 'días'}`;
}
