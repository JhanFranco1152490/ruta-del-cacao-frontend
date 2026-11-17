import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { AssociationIndicators } from '../api';
import { formatKg } from '../indicator-format';

// Las cifras de la asociación en el periodo, arriba de cualquiera de sus distribuciones.
export function AssociationStrip({
  totals,
}: {
  totals: AssociationIndicators['totals'];
}) {
  return (
    <SummaryStrip columns={4} compact label="Resumen del periodo">
      <SummaryValue
        detail={`${totals.producers} ${totals.producers === 1 ? 'productor' : 'productores'}`}
        title="Fincas con cifras"
        value={String(totals.farms)}
      />
      <SummaryValue title="Kg en baba" value={formatKg(totals.green_kg)} />
      <SummaryValue title="Kg secos" value={formatKg(totals.dry_kg)} />
      <SummaryValue title="Kg vendidos" value={formatKg(totals.sold_kg)} />
    </SummaryStrip>
  );
}
