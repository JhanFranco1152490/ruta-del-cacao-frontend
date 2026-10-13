import { SegmentedControl } from '@/components/segmented-control';

import { PENDING_DAY_OPTIONS } from '../activity-pending';

const OPTIONS = PENDING_DAY_OPTIONS.map((days) => ({
  value: String(days),
  label: String(days),
}));

// Cuántos días hacia adelante cuenta Pendientes, además de lo vencido, lo retrasado y lo de hoy:
// botones juntos y bajos, para que quepan en la fila del periodo y se elija con un toque.
export function ActivityPendingDays({
  days,
  onDays,
}: {
  days: number;
  onDays: (days: number) => void;
}) {
  return (
    <div className="ml-auto flex items-center gap-2 text-sm font-bold text-selva">
      <span aria-hidden="true" className="hidden sm:inline">
        Mirar hacia adelante
      </span>
      <SegmentedControl
        compact
        label="Mirar hacia adelante, en días"
        onChange={(value) => onDays(Number(value))}
        options={OPTIONS}
        value={String(days)}
      />
      <span aria-hidden="true">días</span>
    </div>
  );
}
