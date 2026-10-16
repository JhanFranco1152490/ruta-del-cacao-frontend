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

// Los estados en el orden en que se explican: el de la leyenda y el del resumen.
export const ACTIVITY_STATES = Object.keys(
  ACTIVITY_STATE_DISPLAY,
) as ActivityState[];

// Qué se puede hacer con una actividad en cada estado, para la leyenda del calendario.
export const ACTIVITY_STATE_HINT = {
  scheduled: 'Todavía no llega su fecha',
  delayed: 'Pasó su fecha: se puede reprogramar',
  overdue: 'Solo registrar la realización',
  done: 'Ya se registró',
} as const satisfies Record<ActivityState, string>;

// "Retrasada · 1 día", "Vencida · 5 días": el retraso se dice junto al estado.
export function activityStateText(state: ActivityState, daysLate: number) {
  const { label } = ACTIVITY_STATE_DISPLAY[state];
  if (daysLate <= 0) return label;
  return `${label} · ${daysLate} ${daysLate === 1 ? 'día' : 'días'}`;
}

export const PENDING_COMPLETION_LABEL = 'Realizada · pendiente de enviar';

// "1 detección sin control", "2 detecciones sin control": las de un monitoreo realizado a las que
// nadie les ha dado un control ni ha decidido que no lo requieren.
const withoutControlText = (count: number) =>
  `${count} ${count === 1 ? 'detección' : 'detecciones'} sin control`;

// Lo que se muestra como estado de una actividad. Una cuya realización espera en el dispositivo
// ya se hizo, aunque el servidor todavía no lo sepa: se dice así, y no con el estado que tenía. Un
// monitoreo realizado con detecciones sin control lo dice junto al estado, porque falta decidir qué
// hacer con ellas.
export function activityBadge({
  state,
  daysLate,
  completion,
  activity,
}: {
  state: ActivityState;
  daysLate: number;
  completion?: 'pending' | 'error';
  activity?: {
    monitoring?: { detections_without_control: number } | null;
  };
}): { tone: 'ok' | 'warn' | 'err' | 'info'; text: string } {
  if (completion === 'pending') {
    return { tone: 'info', text: PENDING_COMPLETION_LABEL };
  }
  const withoutControl = activity?.monitoring?.detections_without_control ?? 0;
  if (state === 'done' && withoutControl > 0) {
    return {
      tone: 'warn',
      text: `${activityStateText(state, daysLate)} · ${withoutControlText(withoutControl)}`,
    };
  }
  return {
    tone: ACTIVITY_STATE_DISPLAY[state].tone,
    text: activityStateText(state, daysLate),
  };
}
