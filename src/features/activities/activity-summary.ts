import type { ActivityOfDay } from './activity-days';
import { effectiveState } from './activity-days';
import { ACTIVITY_TYPE_OPTIONS, activityTypeLabel } from './activity-labels';
import type { ActivityState } from './activity-state';

export type StateCounts = Record<ActivityState, number>;

export function countByState(items: readonly ActivityOfDay[]): StateCounts {
  const counts: StateCounts = { scheduled: 0, delayed: 0, overdue: 0, done: 0 };
  for (const item of items) counts[effectiveState(item)] += 1;
  return counts;
}

export type TypeCount = { type: string; label: string; count: number };

// Cada tipo de labor con cuántas hay, de la más frecuente a la menos; a igual cantidad, en el
// orden en que se ofrecen en el formulario. Un tipo que esta versión no conoce va al final.
export function countByType(items: readonly ActivityOfDay[]): TypeCount[] {
  const counts = new Map<string, number>();
  for (const { activity } of items) {
    counts.set(
      activity.activity_type,
      (counts.get(activity.activity_type) ?? 0) + 1,
    );
  }
  const position = (type: string) => {
    const index = ACTIVITY_TYPE_OPTIONS.findIndex(
      ({ value }) => value === type,
    );
    return index === -1 ? ACTIVITY_TYPE_OPTIONS.length : index;
  };
  return [...counts.entries()]
    .map(([type, count]) => ({ type, label: activityTypeLabel(type), count }))
    .sort((a, b) => b.count - a.count || position(a.type) - position(b.type));
}

export function summarizeActivities(items: readonly ActivityOfDay[]) {
  return {
    total: items.length,
    byState: countByState(items),
    byType: countByType(items),
  };
}
