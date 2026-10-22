import { CalendarClock } from 'lucide-react';
import Link from 'next/link';

import { formatShortWeekdayDate } from '@/lib/format/dates';

import { scheduledMonitoringPath } from '../health-paths';
import type { UpcomingMonitoring } from '../upcoming-monitorings';
import {
  LINKED_ROW_CLASS,
  ROW_CLASS,
  STRETCHED_LINK_CLASS,
} from './pending-row-class';

// Los monitoreos programados que todavía no llegan a su fecha, del más cercano al más lejano. Cada
// uno abre su detalle en el calendario, que es donde se reprograma o se elimina.
export function UpcomingMonitoringsSection({
  rows,
}: {
  rows: readonly UpcomingMonitoring[];
}) {
  if (rows.length === 0) return null;
  return (
    <section
      aria-label="Próximos monitoreos"
      className="relative space-y-3 overflow-hidden rounded-[var(--radius-card)] bg-card p-4 pt-5 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[var(--morado-cacao)]"
    >
      <h2 className="font-sans text-base font-extrabold text-selva">
        Próximos monitoreos ({rows.length})
      </h2>
      <ul className="motion-stagger space-y-3">
        {rows.map((activity) => (
          <li className={`${ROW_CLASS} ${LINKED_ROW_CLASS}`} key={activity.id}>
            <div className="min-w-0">
              <p className="font-bold">
                {activity.plot.code} · {activity.plot.farm.name}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="first-letter:uppercase">
                  {formatShortWeekdayDate(activity.scheduled_date)}
                </span>
                {` · ${activity.assignee.full_name}`}
              </p>
            </div>
            <Link
              className={`inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-alt px-2.5 py-1 text-sm font-bold text-selva ${STRETCHED_LINK_CLASS}`}
              href={scheduledMonitoringPath(
                activity.id,
                activity.scheduled_date,
              )}
            >
              <CalendarClock aria-hidden="true" className="size-4" />
              Programado
              <span className="sr-only">
                : abrir el monitoreo de {activity.plot.code} en el calendario
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
