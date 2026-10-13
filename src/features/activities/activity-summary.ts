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

const STATE_NOUN: Record<ActivityState, [singular: string, plural: string]> = {
  scheduled: ['programada', 'programadas'],
  delayed: ['retrasada', 'retrasadas'],
  overdue: ['vencida', 'vencidas'],
  done: ['realizada', 'realizadas'],
};

// El recuento dicho en palabras, de lo más urgente a lo menos y sin los estados que no tienen
// nada: "1 vencida, 2 programadas". Para el nombre de un día en el calendario.
export function describeStateCounts(counts: StateCounts): string {
  return (['overdue', 'delayed', 'scheduled', 'done'] as const)
    .filter((state) => counts[state] > 0)
    .map((state) => {
      const [singular, plural] = STATE_NOUN[state];
      return `${counts[state]} ${counts[state] === 1 ? singular : plural}`;
    })
    .join(', ');
}
