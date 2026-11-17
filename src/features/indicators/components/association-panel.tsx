import { ColumnChart } from '@/components/charts/column-chart';
import { SectionCard } from '@/components/page-blocks/section-card';
import { SegmentedControl } from '@/components/segmented-control';

import type { AssociationIndicators } from '../api';
import { KG_COLORS, monthGroups } from '../indicator-charts';
import { formatKg } from '../indicator-format';
import {
  type AssociationSection,
  INDICATOR_SECTIONS,
} from '../indicator-sections';
import { AssociationFarmsSection } from './association-farms-section';
import { AssociationScatterSection } from './association-scatter-section';
import { AssociationStrip } from './association-strip';
import { QualitySection } from './quality-section';
import { VarietiesSection } from './varieties-section';

const SERIES = [
  { key: 'green_kg', label: 'En baba', color: KG_COLORS.green },
  { key: 'dry_kg', label: 'Seco', color: KG_COLORS.dry },
  { key: 'sold_kg', label: 'Vendido', color: KG_COLORS.sold },
];

// El panel de la asociación: por finca o por productor, producción, calidad y kilos vendidos, y por
// variedad de cacao. Nada por parcela, por lote ni de existencias.
export function AssociationPanel({
  data,
  section,
  onSection,
}: {
  data: AssociationIndicators;
  section: AssociationSection;
  onSection: (section: AssociationSection) => void;
}) {
  return (
    <div className="space-y-5">
      <AssociationStrip totals={data.totals} />
      <SegmentedControl
        compact
        fullWidth
        label="Sección"
        onChange={onSection}
        options={INDICATOR_SECTIONS.association}
        value={section}
      />
      {section === 'farms' && (
        <>
          <AssociationFarmsSection farms={data.farms} />
          <AssociationScatterSection data={data} />
        </>
      )}
      {section === 'quality' && (
        <>
          <VarietiesSection varieties={data.varieties} />
          <QualitySection quality={data.totals} />
        </>
      )}
      {section === 'months' && (
        <SectionCard
          accent="cobre"
          collapsible
          title="Producción y ventas por mes"
        >
          <ColumnChart
            formatValue={(value) => formatKg(value.toFixed(1))}
            groups={monthGroups(data.months, ['green_kg', 'dry_kg', 'sold_kg'])}
            label="Kilos cosechados, secos y vendidos por mes"
            series={SERIES}
          />
        </SectionCard>
      )}
    </div>
  );
}
