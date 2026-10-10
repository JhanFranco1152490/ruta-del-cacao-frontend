import { StatusBadge } from '@/components/status-badge';
import { formatWeekdayLongDate } from '@/lib/format/dates';

import type { ActivityOfDay } from '../activity-days';
import {
  ACTIVITY_STATE_DISPLAY,
  activityStateText,
  activityTitle,
} from '../activity-labels';

// La actividad que se va a registrar como realizada. Desde aquí no se cambia nada de ella.
export function CompletionActivityCard({
  item: { activity, state, daysLate },
}: {
  item: ActivityOfDay;
}) {
  const { plot, assignee } = activity;
  return (
    <section
      aria-label="Actividad"
      className="space-y-3 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">Actividad</p>
          <h2 className="mt-1 text-2xl text-selva">
            {activityTitle(activity)} · {plot.code}
          </h2>
        </div>
        {/* En campo el estado va en bloque sólido: se lee al sol. */}
        <StatusBadge solid tone={ACTIVITY_STATE_DISPLAY[state].tone}>
          {activityStateText(state, daysLate)}
        </StatusBadge>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-bold text-muted-foreground">Programada</dt>
          <dd className="first-letter:uppercase">
            {formatWeekdayLongDate(activity.scheduled_date)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Responsable</dt>
          <dd>{assignee.full_name}</dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Finca</dt>
          <dd>{plot.farm.name}</dd>
        </div>
      </dl>
    </section>
  );
}
