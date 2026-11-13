import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { ReportTotal } from '../api';
import { totalItems } from '../report-total-items';

// Los totales del reporte, tal como los calcula el servidor (aquí solo se les da formato).
export function ReportTotals({ totals }: { totals: readonly ReportTotal[] }) {
  const items = totalItems(totals);
  const wide = items.length > 3;
  return (
    <SummaryStrip
      columns={wide ? 4 : 3}
      compact={wide}
      label="Totales del reporte"
    >
      {items.map(({ key, title, value, detail }) => (
        <SummaryValue detail={detail} key={key} title={title} value={value} />
      ))}
    </SummaryStrip>
  );
}
