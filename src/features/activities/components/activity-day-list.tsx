import { formatWeekdayDate } from '@/lib/format/dates';

import type { ActivityDay } from '../activity-days';
import { ActivityCard } from './activity-card';

// Las actividades del mes agrupadas por día: solo aparecen los días que tienen alguna.
export function ActivityDayList({ days }: { days: readonly ActivityDay[] }) {
  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section aria-labelledby={`day-${day.date}`} key={day.date}>
          <h3 className="flex items-center gap-2 font-sans text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase">
            {/* El día nombra la sección; "Hoy" queda fuera del nombre. */}
            <span id={`day-${day.date}`}>{formatWeekdayDate(day.date)}</span>
            {day.isToday && (
              <span className="rounded-full bg-cobre px-2 py-0.5 tracking-[0.08em] text-primary-foreground">
                Hoy
              </span>
            )}
          </h3>
          <ul className="mt-3 space-y-3">
            {day.activities.map((item) => (
              <li key={item.activity.id}>
                <ActivityCard {...item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
