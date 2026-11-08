import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { BuyerSummary } from '../buyer-summary';
import { buyerCountText } from '../buyer-format';
import { buyerTypeLabel } from '../buyer-types';

// Las cifras de lo que se buscó: cuántos activos e inactivos hay y a qué se dedican la mayoría. Sin
// `compact`: el tipo es un texto largo («Intermediario o acopiador») que no cabe en un tercio del
// celular.
export function BuyerSummaryStrip({ summary }: { summary: BuyerSummary }) {
  const { active, inactive, topType } = summary;
  return (
    <SummaryStrip label="Resumen de compradores">
      <SummaryValue title="Compradores activos" value={String(active)} />
      <SummaryValue title="Inactivos" value={String(inactive)} />
      <SummaryValue
        detail={topType ? buyerCountText(topType.count) : undefined}
        title="Tipo más frecuente"
        value={topType ? buyerTypeLabel(topType.type) : '—'}
      />
    </SummaryStrip>
  );
}
