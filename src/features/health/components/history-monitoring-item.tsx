import type { components } from '@/lib/api/schema';
import { formatWeekdayLongDate } from '@/lib/format/dates';

import { MonitoringResultSection } from './monitoring-result-section';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const photosText = (count: number) =>
  count === 1 ? '1 foto' : `${count} fotos`;

// Un monitoreo del historial: cuándo se hizo, quién lo registró y su resultado, con lo mismo que su
// detalle. Las fotos no se cargan aquí: solo se dice cuántas hay.
export function HistoryMonitoringItem({
  activity,
}: {
  activity: AgriculturalActivity;
}) {
  const { monitoring } = activity;
  if (!monitoring) return null;
  const date = activity.done_date ?? activity.scheduled_date;
  return (
    <li className="space-y-3 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl text-selva first-letter:uppercase">
          {formatWeekdayLongDate(date)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {activity.completed_by &&
            `Registró ${activity.completed_by.full_name}`}
          {monitoring.evidence_count > 0 &&
            ` · ${photosText(monitoring.evidence_count)}`}
        </p>
      </div>
      <MonitoringResultSection activity={activity} monitoring={monitoring} />
    </li>
  );
}
