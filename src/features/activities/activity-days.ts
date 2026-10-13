import { type ActivityState, activityState } from './activity-state';
import type { AgriculturalActivity } from './api';

// La realización de una actividad que sigue en este dispositivo: esperando conexión o rechazada
// por el servidor.
export type QueuedCompletionStatus = 'pending' | 'error';

export type ActivityOfDay = {
  activity: AgriculturalActivity;
  state: ActivityState;
  daysLate: number;
  completion?: QueuedCompletionStatus;
};

export type ActivityDay = {
  // yyyy-MM-dd
  date: string;
  isToday: boolean;
  activities: ActivityOfDay[];
};

// Una actividad con el estado que tiene hoy en el dispositivo (no el que trajo la copia) y, si su
// realización sigue en la cola, cuál es. `completions` trae, por actividad, esa realización.
export function toActivityOfDay(
  activity: AgriculturalActivity,
  today: string,
  completions: ReadonlyMap<string, QueuedCompletionStatus> = new Map(),
): ActivityOfDay {
  const completion = completions.get(activity.id);
  return {
    activity,
    ...activityState(activity, today),
    ...(completion && { completion }),
  };
}

// El estado con el que se cuenta y se filtra una actividad: una cuya realización espera en el
// dispositivo ya se hizo, aunque el servidor todavía no lo sepa. Una rechazada conserva el suyo.
export const effectiveState = ({ state, completion }: ActivityOfDay) =>
  completion === 'pending' ? 'done' : state;

// Las actividades bajo su día programado, del más antiguo al más reciente, y solo los días que
// tienen alguna. Una realizada se queda en el día en que estaba planeada: la lista muestra la
// planeación y su cumplimiento. `today` marca el día de hoy.
export function groupItemsByDay(
  items: readonly ActivityOfDay[],
  today: string,
): ActivityDay[] {
  const byDate = new Map<string, ActivityOfDay[]>();
  for (const item of items) {
    const day = byDate.get(item.activity.scheduled_date) ?? [];
    day.push(item);
    byDate.set(item.activity.scheduled_date, day);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ofDay]) => ({
      date,
      isToday: date === today,
      activities: ofDay,
    }));
}

// Lo mismo, partiendo de las actividades tal como llegan: el estado se calcula con `today`, la
// fecha del dispositivo, y `completions` trae la realización que sigue en la cola.
export const groupActivitiesByDay = (
  activities: readonly AgriculturalActivity[],
  today: string,
  completions: ReadonlyMap<string, QueuedCompletionStatus> = new Map(),
): ActivityDay[] =>
  groupItemsByDay(
    activities.map((activity) => toActivityOfDay(activity, today, completions)),
    today,
  );
