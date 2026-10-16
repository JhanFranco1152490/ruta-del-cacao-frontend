import type { components } from '@/lib/api/schema';
import { formatWeekdayLongDate } from '@/lib/format/dates';

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
      className="space-y-3 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
    >
      <div>
        <p className="section-label">Monitoreo fitosanitario</p>
        <h2 className="mt-1 text-2xl text-selva">
          Parcela {plot.code} · {plot.farm.name}
        </h2>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-bold text-muted-foreground">Programado</dt>
          <dd className="first-letter:uppercase">
            {formatWeekdayLongDate(activity.scheduled_date)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-muted-foreground">Responsable</dt>
          <dd>{assignee.full_name}</dd>
        </div>
      </dl>
    </section>
  );
}
