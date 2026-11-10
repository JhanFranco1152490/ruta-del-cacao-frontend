import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { StockSummary } from '../api';
import { kilosText } from '../exit-quantity';

// Cuánto hay en bodega con los filtros de las existencias puestos. Mientras llega, o si falla, queda
// en «—».
export function WarehouseSummary({
  summary,
}: {
  summary: StockSummary | undefined;
}) {
  return (
    <SummaryStrip compact label="Resumen de bodega">
      <SummaryValue
        title="Total G1 (kg)"
        value={summary ? kilosText(summary.g1_kg) : '—'}
      />
      <SummaryValue
        title="Total G2 (kg)"
        value={summary ? kilosText(summary.g2_kg) : '—'}
      />
      <SummaryValue
        title="Lotes en bodega"
        value={summary ? String(summary.lots) : '—'}
      />
    </SummaryStrip>
  );
}
