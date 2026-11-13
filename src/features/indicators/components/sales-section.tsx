import { ColumnChart } from '@/components/charts/column-chart';
import { SectionCard } from '@/components/page-blocks/section-card';

import type { ProducerIndicators } from '../api';
import { KG_COLORS, monthGroups } from '../indicator-charts';
import { formatKg } from '../indicator-format';

const SERIES = [{ key: 'sold_kg', label: 'Vendido', color: KG_COLORS.sold }];

// Los kilos vendidos mes a mes, sin las ventas anuladas.
export function SalesSection({
  sales,
}: {
  sales: ProducerIndicators['sales'];
}) {
  return (
    <SectionCard accent="cobre" title="Ventas">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {sales.sales === 0
            ? 'No se registraron ventas en el periodo.'
            : `${sales.sales} ${sales.sales === 1 ? 'venta' : 'ventas'}: ${formatKg(sales.g1_kg)} de G1 y ${formatKg(sales.g2_kg)} de G2.`}
        </p>
        <ColumnChart
          formatValue={(value) => formatKg(value.toFixed(1))}
          groups={monthGroups(sales.months, ['sold_kg'])}
          label="Kilos vendidos por mes"
          series={SERIES}
        />
      </div>
    </SectionCard>
  );
}
