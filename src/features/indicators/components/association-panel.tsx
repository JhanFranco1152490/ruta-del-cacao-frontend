'use client';

import { useState } from 'react';

import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { ShareBar } from '@/components/charts/share-bar';
import { SectionCard } from '@/components/page-blocks/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { SummaryStrip, SummaryValue } from '@/components/summary-strip';
import { useMunicipalityName } from '@/lib/api/municipalities';

import type { AssociationIndicators } from '../api';
import {
  ASSOCIATION_METRIC_OPTIONS,
  type AssociationMetric,
  KG_COLORS,
  associationFarmBars,
  monthGroups,
  qualitySegments,
} from '../indicator-charts';
import { formatKg } from '../indicator-format';
import { QualitySection } from './quality-section';

const SERIES = [
  { key: 'green_kg', label: 'En baba', color: KG_COLORS.green },
  { key: 'dry_kg', label: 'Seco', color: KG_COLORS.dry },
  { key: 'sold_kg', label: 'Vendido', color: KG_COLORS.sold },
];

const METRIC_COLORS = {
  green: KG_COLORS.green,
  dry: KG_COLORS.dry,
  sold: KG_COLORS.sold,
} as const;

// El panel de la asociación: por finca, producción, calidad y kilos vendidos. Nada por parcela, por
// lote ni de existencias.
export function AssociationPanel({ data }: { data: AssociationIndicators }) {
  const municipalityName = useMunicipalityName();
  const [metric, setMetric] = useState<AssociationMetric>('green');
  const { totals } = data;
  return (
    <div className="space-y-5">
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
      <SectionCard
        accent="cobre"
        actions={
          <SegmentedControl
            compact
            label="Kilos"
            onChange={setMetric}
            options={ASSOCIATION_METRIC_OPTIONS}
            value={metric}
          />
        }
        count={data.farms.length}
        title="Kilos por finca"
      >
        <BarList
          color={METRIC_COLORS[metric]}
          label="Kilos por finca"
          rows={associationFarmBars(data.farms, metric, municipalityName)}
        />
      </SectionCard>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <QualitySection quality={totals} />
        <SectionCard accent="cobre" title="Calidad por finca">
          <ul className="motion-stagger space-y-4">
            {data.farms.map((farm) => (
              <li className="min-w-0" key={farm.farm_id}>
                <p className="truncate font-semibold">
                  {farm.farm_code} · {farm.farm_name}
                </p>
                <ShareBar
                  compact
                  label={`Calidad de ${farm.farm_name}`}
                  segments={qualitySegments(farm)}
                />
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
      <SectionCard accent="cobre" title="Producción y ventas por mes">
        <ColumnChart
          formatValue={(value) => formatKg(value.toFixed(1))}
          groups={monthGroups(data.months, ['green_kg', 'dry_kg', 'sold_kg'])}
          label="Kilos cosechados, secos y vendidos por mes"
          series={SERIES}
        />
      </SectionCard>
    </div>
  );
}
