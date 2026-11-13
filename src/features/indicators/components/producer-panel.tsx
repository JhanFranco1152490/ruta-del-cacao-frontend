import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { ProducerIndicators } from '../api';
import { formatKg, formatKgPerHectare } from '../indicator-format';
import { ProductionSection } from './production-section';
import { QualitySection } from './quality-section';
import { SalesSection } from './sales-section';
import { StockSection } from './stock-section';

// El panel de la unidad productiva: cuatro cifras arriba y, debajo, producción, calidad, existencias
// y ventas. Todo sale ya calculado del servidor.
export function ProducerPanel({ data }: { data: ProducerIndicators }) {
  const { production, quality, inventory, sales } = data;
  return (
    <div className="space-y-5">
      <SummaryStrip columns={4} compact label="Resumen del periodo">
        <SummaryValue
          detail={formatKgPerHectare(production.green_kg_per_hectare)}
          title="Kg en baba"
          value={formatKg(production.green_kg)}
        />
        <SummaryValue
          detail={formatKgPerHectare(production.dry_kg_per_hectare)}
          title="Kg secos"
          value={formatKg(production.dry_kg)}
        />
        <SummaryValue
          detail="Hoy, sin importar el periodo"
          title="En bodega"
          value={formatKg(inventory.total_kg)}
        />
        <SummaryValue
          detail={`${sales.sales} ${sales.sales === 1 ? 'venta' : 'ventas'}`}
          title="Kg vendidos"
          value={formatKg(sales.sold_kg)}
        />
      </SummaryStrip>
      <ProductionSection production={production} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <QualitySection
          lots={{
            classified: quality.lots_classified,
            discarded: quality.lots_discarded,
          }}
          quality={quality}
        />
        <StockSection inventory={inventory} />
      </div>
      <SalesSection sales={sales} />
    </div>
  );
}
