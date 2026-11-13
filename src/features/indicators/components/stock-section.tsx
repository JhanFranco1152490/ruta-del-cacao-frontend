import { BarList } from '@/components/charts/bar-list';
import { SectionCard } from '@/components/page-blocks/section-card';

import type { ProducerIndicators } from '../api';
import { GRADE_COLORS, farmStockBars, stockBars } from '../indicator-charts';
import { formatKg } from '../indicator-format';

// Lo que hay hoy en bodega, por calibre y, si hay más de una finca, por finca. No depende del
// periodo: es lo que hay ahora.
export function StockSection({
  inventory,
}: {
  inventory: ProducerIndicators['inventory'];
}) {
  const hasStock = Number(inventory.total_kg) > 0;
  return (
    <SectionCard accent="cobre" title="Existencias en bodega">
      {hasStock ? (
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Hoy hay {formatKg(inventory.total_kg)} de cacao seco clasificado,
            sin importar el periodo.
          </p>
          <BarList
            color={GRADE_COLORS.g1}
            label="Existencias por calibre"
            rows={stockBars(inventory)}
          />
          {inventory.farms.length > 1 && (
            <BarList
              label="Existencias por finca"
              rows={farmStockBars(inventory.farms)}
            />
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No hay cacao en bodega en este momento.
        </p>
      )}
    </SectionCard>
  );
}
