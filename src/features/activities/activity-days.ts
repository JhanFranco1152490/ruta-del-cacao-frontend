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

// Las actividades bajo su día programado, del más antiguo al más reciente, y solo los días que
// tienen alguna. Una realizada se queda en el día en que estaba planeada: la lista muestra la
// planeación y su cumplimiento. El estado se calcula con `today`, la fecha del dispositivo.
// `completions` trae, por actividad, la realización que sigue en la cola del dispositivo.
export function groupActivitiesByDay(
  activities: readonly AgriculturalActivity[],
  today: string,
  completions: ReadonlyMap<string, QueuedCompletionStatus> = new Map(),
): ActivityDay[] {
  const byDate = new Map<string, ActivityOfDay[]>();
  for (const activity of activities) {
    const day = byDate.get(activity.scheduled_date) ?? [];
    const completion = completions.get(activity.id);
    day.push({
      activity,
      ...activityState(activity, today),
      ...(completion && { completion }),
    });
    byDate.set(activity.scheduled_date, day);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ofDay]) => ({
      date,
      isToday: date === today,
      activities: ofDay,
    }));
}
