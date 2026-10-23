import { formatShortDateTime } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

// El volteo anterior, arriba del formulario: para comparar en el momento lo que se acaba de medir.
export function PreviousTurn({
  number,
  turn,
}: {
  number: number;
  turn: { turned_at: string; temperature_c: string; ph: string };
}) {
  return (
    <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
      {[
        `Volteo anterior: ${number}`,
        formatShortDateTime(turn.turned_at),
        `${formatDecimal(turn.temperature_c, 1)} °C`,
        `pH ${formatDecimal(turn.ph, 2)}`,
      ].join(' · ')}
    </p>
  );
}
