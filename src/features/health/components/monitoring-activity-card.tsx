import type { components } from '@/lib/api/schema';
import { formatShortWeekdayDate } from '@/lib/format/dates';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// El monitoreo cuyo resultado se registra. Desde aquí no se cambia nada de él.
export function MonitoringActivityCard({
  activity,
}: {
  activity: AgriculturalActivity;
}) {
  const { plot, assignee } = activity;
  return (
    <section
      aria-label="Monitoreo"
      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-[var(--radius-card)] bg-card px-4 py-3 shadow-card"
    >
      <h2 className="text-xl text-selva">
        Parcela {plot.code} · {plot.farm.name}
      </h2>
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="font-bold text-muted-foreground">Programado</dt>
          <dd>{formatShortWeekdayDate(activity.scheduled_date)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-bold text-muted-foreground">Responsable</dt>
          <dd>{assignee.full_name}</dd>
        </div>
      </dl>
    </section>
  );
}
