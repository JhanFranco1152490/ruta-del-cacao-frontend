import { SummaryStrip, SummaryValue } from '@/components/summary-strip';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { QualitySummary as Summary } from '../api';

// Las cifras del trabajo de calidad, con los filtros puestos. Mientras llegan, o si fallan, quedan
// en «—».
export function QualitySummary({ summary }: { summary: Summary | undefined }) {
  const count = (value: number | undefined) =>
    value === undefined ? '—' : String(value);
  return (
    <SummaryStrip compact label="Resumen de calidad">
      <SummaryValue
        detail={
          summary
            ? `${formatFixedDecimal(summary.to_evaluate_kg, 1)} kg secos`
            : undefined
        }
        title="Por evaluar"
        value={count(summary?.to_evaluate)}
      />
      <SummaryValue title="Por clasificar" value={count(summary?.evaluated)} />
      <SummaryValue
        title="Descartados este mes"
        value={count(summary?.discarded_this_month)}
      />
    </SummaryStrip>
  );
}
