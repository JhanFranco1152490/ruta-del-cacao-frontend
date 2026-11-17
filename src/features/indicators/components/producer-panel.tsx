import { ColumnChart } from '@/components/charts/column-chart';
import { Funnel } from '@/components/charts/funnel';
import { SectionCard } from '@/components/page-blocks/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { SummaryStrip, SummaryValue } from '@/components/summary-strip';

import type { ProducerIndicators } from '../api';
import { KG_COLORS, monthGroups } from '../indicator-charts';
import { formatKg, formatKgPerHectare } from '../indicator-format';
import { funnelSteps } from '../indicator-funnel';
import {
  INDICATOR_SECTIONS,
  type ProducerSection,
} from '../indicator-sections';
import { insightsOfSection, producerInsights } from '../indicator-insights';
import { InsightsStrip } from './insights-strip';
import { PlotsTable } from './plots-table';
import { QualitySection } from './quality-section';
import { SalesSection } from './sales-section';
import { StockSection } from './stock-section';
import { VarietiesSection } from './varieties-section';

const SERIES = [
  { key: 'green_kg', label: 'En baba', color: KG_COLORS.green },
  { key: 'dry_kg', label: 'Seco', color: KG_COLORS.dry },
];

// El panel de la unidad productiva: cuatro cifras, lo que hay que mirar en frases, la cadena del cacao
// de izquierda a derecha y, debajo, las parcelas, las variedades, el mes a mes, la calidad, las
// existencias y las ventas. Todo sale ya calculado del servidor.
export function ProducerPanel({
  data,
  section,
  onSection,
}: {
  data: ProducerIndicators;
  section: ProducerSection;
  onSection: (section: ProducerSection) => void;
}) {
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
      <SegmentedControl
        compact
        fullWidth
        label="Sección"
        onChange={onSection}
        options={INDICATOR_SECTIONS.producer}
        value={section}
      />
      <InsightsStrip
        insights={insightsOfSection(producerInsights(data), section)}
      />
      {section === 'production' && (
        <>
          <SectionCard accent="cobre" collapsible title="Del árbol a la venta">
            <Funnel label="Kilos en cada paso" steps={funnelSteps(data)} />
            <p className="mt-3 text-xs text-muted-foreground">
              Producción, calidad y ventas son del periodo; la bodega es lo de
              hoy.
            </p>
          </SectionCard>
          <SectionCard
            accent="cobre"
            collapsible
            count={production.plots.length}
            title="Parcelas"
          >
            <PlotsTable production={production} />
          </SectionCard>
          <SectionCard accent="cobre" collapsible title="Producción por mes">
            <ColumnChart
              formatValue={(value) => formatKg(value.toFixed(1))}
              groups={monthGroups(production.months, ['green_kg', 'dry_kg'])}
              label="Kilos cosechados y secos por mes"
              series={SERIES}
            />
          </SectionCard>
        </>
      )}
      {section === 'quality' && (
        <>
          <VarietiesSection varieties={data.varieties} />
          <QualitySection
            lots={{
              classified: quality.lots_classified,
              discarded: quality.lots_discarded,
            }}
            quality={quality}
          />
        </>
      )}
      {section === 'stock-sales' && (
        <>
          <StockSection inventory={inventory} />
          <SalesSection sales={sales} />
        </>
      )}
    </div>
  );
}
