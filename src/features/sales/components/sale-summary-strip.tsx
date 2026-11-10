import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { SaleSummary } from '../api';
import { saleSummaryFigures } from '../sale-summary';

// Lo vendido en el mes con los filtros puestos, sin las anuladas. Mientras llega, o si falla, queda
// en «—». Con cuatro cifras, en celular van en dos filas de dos.
export function SaleSummaryStrip({
  summary,
}: {
  summary: SaleSummary | undefined;
}) {
  const figures = summary ? saleSummaryFigures(summary) : null;
  return (
    <SummaryStrip columns={4} compact label="Resumen de ventas">
      <SummaryValue title="Valor vendido" value={figures?.total ?? '—'} />
      <SummaryValue title="Kg de G1" value={figures?.g1Kg ?? '—'} />
      <SummaryValue title="Kg de G2" value={figures?.g2Kg ?? '—'} />
      <SummaryValue title="Ventas" value={figures?.sales ?? '—'} />
    </SummaryStrip>
  );
}
