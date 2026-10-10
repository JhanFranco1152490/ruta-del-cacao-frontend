import { StatusBadge } from '@/components/status-badge';

import type { ActivityOfDay } from '../activity-days';
import {
  ACTIVITY_STATE_DISPLAY,
  activityStateText,
  activityTitle,
} from '../activity-labels';

// El borde repite el tono del estado, que ya dicen el ícono y el texto de la etiqueta.
const BORDER_BY_TONE = {
  info: 'border-l-info',
  warn: 'border-l-warn',
  err: 'border-l-err',
  ok: 'border-l-ok',
} as const;

// Una actividad en la lista: la labor, dónde es, quién la hace y cómo va.
export function ActivityCard({ activity, state, daysLate }: ActivityOfDay) {
  const { tone } = ACTIVITY_STATE_DISPLAY[state];
  const { plot, assignee } = activity;

  return (
    <article
      className={`flex flex-col gap-2 rounded-xl border-l-[5px] bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between ${BORDER_BY_TONE[tone]}`}
    >
      <div className="min-w-0 space-y-1">
        <h4 className="font-sans text-base font-extrabold text-selva">
          {activityTitle(activity)}
        </h4>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-muted-foreground">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-selva">
            {plot.code}
          </span>
          <span>{plot.farm.name}</span>
          <span aria-hidden="true">·</span>
          <span>
            {assignee.full_name}
            {!assignee.is_active && ' (cuenta inactiva)'}
          </span>
        </p>
      </div>
      <div className="shrink-0">
        <StatusBadge tone={tone}>
          {activityStateText(state, daysLate)}
        </StatusBadge>
      </div>
    </article>
  );
}
