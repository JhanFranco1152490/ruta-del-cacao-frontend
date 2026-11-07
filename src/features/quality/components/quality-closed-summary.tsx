import { SummaryStrip, SummaryValue } from '@/components/summary-strip';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { ClosedSummary } from '../api';

const kilos = (value: string | undefined) =>
  value === undefined ? '—' : `${formatFixedDecimal(value, 1)} kg`;

// Lo que dejó el periodo de cierre elegido: cuántos lotes se clasificaron y cuántos kilos de G1 y
// G2 salieron de ellos (lo que Bodega recibe), y cuántos se descartaron con los kilos que quedaron
// fuera. Mientras llegan, o si fallan, quedan en «—».
export function QualityClosedSummary({
  summary,
}: {
  summary: ClosedSummary | undefined;
}) {
  const count = (value: number | undefined) =>
    value === undefined ? '—' : String(value);
  return (
    <SummaryStrip columns={4} compact label="Resumen de lotes cerrados">
      <SummaryValue title="Clasificados" value={count(summary?.classified)} />
      <SummaryValue title="G1" value={kilos(summary?.g1_kg)} />
      <SummaryValue title="G2" value={kilos(summary?.g2_kg)} />
      <SummaryValue
        detail={summary ? `${kilos(summary.discarded_kg)} fuera` : undefined}
        title="Descartados"
        value={count(summary?.discarded)}
      />
    </SummaryStrip>
  );
}
