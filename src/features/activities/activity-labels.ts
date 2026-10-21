import { ACTIVITY_TYPE_OPTIONS } from '@/lib/activity-types';

import type { ActivityState } from './activity-state';

// Los nombres de los tipos los leen también otros dominios: viven en `lib/`.
export {
  ACTIVITY_TYPE_OPTIONS,
  activityTitle,
  activityTypeLabel,
} from '@/lib/activity-types';

// Las labores que se eligen en el formulario de programar. Las dos de sanidad tienen su propia
// entrada: un control nace de la detección de un monitoreo, y un monitoreo se programa con su botón
// («Programar monitoreo»), porque se cierra con una planilla de resultado y no con la realización.
export const SCHEDULABLE_ACTIVITY_TYPE_OPTIONS = ACTIVITY_TYPE_OPTIONS.filter(
  ({ value }) =>
    value !== 'phytosanitary_control' && value !== 'phytosanitary_monitoring',
);

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

// Qué se puede hacer con una actividad en cada estado: es el texto de ayuda de las píldoras de
// estado del calendario, que además son su recuento y su clave de colores.
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
export const PENDING_SCHEDULE_LABEL = 'Programada · pendiente de enviar';

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
  queued,
  activity,
}: {
  state: ActivityState;
  daysLate: number;
  completion?: 'pending' | 'error';
  queued?: 'pending' | 'error';
  activity?: {
    monitoring?: { detections_without_control: number } | null;
  };
}): { tone: 'ok' | 'warn' | 'err' | 'info'; text: string } {
  if (completion === 'pending') {
    return { tone: 'info', text: PENDING_COMPLETION_LABEL };
  }
  if (queued === 'pending') {
    return { tone: 'info', text: PENDING_SCHEDULE_LABEL };
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
