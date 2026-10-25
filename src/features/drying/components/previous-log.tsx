import { formatShortDayMonth } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';

// La bitácora anterior, arriba del formulario: para comparar en el momento lo que se acaba de medir.
export function PreviousLog({
  day,
  log,
}: {
  day: number;
  log: { measured_at: string; moisture_pct: string };
}) {
  return (
    <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
      {[
        `Bitácora anterior: día ${day}`,
        formatShortDayMonth(log.measured_at),
        `${formatFixedDecimal(log.moisture_pct, 1)} %`,
      ].join(' · ')}
    </p>
  );
}
