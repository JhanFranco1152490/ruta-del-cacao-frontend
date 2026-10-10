import { type ActivityState, activityState } from './activity-state';
import type { AgriculturalActivity } from './api';

export type ActivityOfDay = {
  activity: AgriculturalActivity;
  state: ActivityState;
  daysLate: number;
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
export function groupActivitiesByDay(
  activities: readonly AgriculturalActivity[],
  today: string,
): ActivityDay[] {
  const byDate = new Map<string, ActivityOfDay[]>();
  for (const activity of activities) {
    const day = byDate.get(activity.scheduled_date) ?? [];
    day.push({ activity, ...activityState(activity, today) });
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
