import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { ExitSummary } from '../api';
import { kilosText } from '@/lib/stock-quantity';
import { exitReasonText } from '../exit-reasons';

// Los motivos que se nombran en la franja: los que más kilos sacaron.
export const SUMMARY_REASONS = 3;

// Lo que salió con los filtros puestos: el total y, de cada motivo, los kilos. Lo anulado no cuenta.
// Mientras llega, o si falla, queda en «—».
export function ExitSummaryStrip({
  summary,
}: {
  summary: ExitSummary | undefined;
}) {
  const reasons = summary?.by_reason.slice(0, SUMMARY_REASONS) ?? [];
  return (
    <SummaryStrip columns={4} compact label="Resumen de salidas">
      <SummaryValue
        detail={summary ? `${summary.exits} salidas vigentes` : undefined}
        title="Salió en total (kg)"
        value={summary ? kilosText(summary.quantity_kg) : '—'}
      />
      {reasons.map(({ reason, quantity_kg: kilos, exits }) => (
        <SummaryValue
          detail={`${exits} ${exits === 1 ? 'salida' : 'salidas'}`}
          key={reason}
          title={`${exitReasonText(reason)} (kg)`}
          value={kilosText(kilos)}
        />
      ))}
    </SummaryStrip>
  );
}
