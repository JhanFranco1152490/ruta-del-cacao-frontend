'use client';

import { useState } from 'react';

import { BarList } from '@/components/charts/bar-list';
import { ColumnChart } from '@/components/charts/column-chart';
import { SectionCard } from '@/components/page-blocks/section-card';
import { SegmentedControl } from '@/components/segmented-control';

import type { ProducerIndicators } from '../api';
import {
  KG_COLORS,
  PRODUCTION_METRIC_OPTIONS,
  type ProductionMetric,
  monthGroups,
  plotBars,
} from '../indicator-charts';
import { formatKg, formatKgPerHectare } from '../indicator-format';

const SERIES = [
  { key: 'green_kg', label: 'En baba', color: KG_COLORS.green },
  { key: 'dry_kg', label: 'Seco', color: KG_COLORS.dry },
];

// Los kilos de cada parcela, en baba o secos, con lo que rinde por hectárea; y, aparte, mes a mes.
// «Sin secar» es lo cosechado cuyo secado no ha terminado: explica por qué el seco es menor.
export function ProductionSection({
  production,
}: {
  production: ProducerIndicators['production'];
}) {
  const [metric, setMetric] = useState<ProductionMetric>('green');
  const perHectare =
    metric === 'green'
      ? production.green_kg_per_hectare
      : production.dry_kg_per_hectare;
  return (
    <>
      <SectionCard
        accent="cobre"
        actions={
          <SegmentedControl
            compact
            label="Kilos"
            onChange={setMetric}
            options={PRODUCTION_METRIC_OPTIONS}
            value={metric}
          />
        }
        count={production.plots.length}
        title="Producción por parcela"
      >
        {production.plots.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              En total{' '}
              {formatKg(
                metric === 'green' ? production.green_kg : production.dry_kg,
              )}
              {' · '}
              {formatKgPerHectare(perHectare)} sobre {production.area_hectares}{' '}
              ha declaradas.
              {metric === 'dry' &&
                Number(production.green_kg_not_dried) > 0 &&
                ` Faltan por secar ${formatKg(production.green_kg_not_dried)} de lo cosechado.`}
            </p>
            <BarList
              label={`Kilos ${metric === 'green' ? 'en baba' : 'secos'} por parcela`}
              rows={plotBars(production.plots, metric)}
              color={metric === 'green' ? KG_COLORS.green : KG_COLORS.dry}
            />
          </div>
        ) : (
          <p className="text-muted-foreground">
            No hay parcelas con cosechas en el periodo.
          </p>
        )}
      </SectionCard>
      <SectionCard accent="cobre" title="Producción por mes">
        <ColumnChart
          formatValue={(value) => formatKg(value.toFixed(1))}
          groups={monthGroups(production.months, ['green_kg', 'dry_kg'])}
          label="Kilos cosechados y secos por mes"
          series={SERIES}
        />
      </SectionCard>
    </>
  );
}
