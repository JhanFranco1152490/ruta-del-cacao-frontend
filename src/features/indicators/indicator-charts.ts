import type { BarRow } from '@/components/charts/bar-list';
import type { ColumnGroup } from '@/components/charts/column-chart';
import type { ShareSegment } from '@/components/charts/share-bar';
import { farmLabel } from '@/lib/format/place-label';

import type {
  AssociationIndicators,
  FarmStock,
  ProducerIndicators,
  QualitySplit,
} from './api';
import { formatKg, formatShare, monthTick } from './indicator-format';
import { formatMonthYear } from '@/lib/format/dates';

// De qué se dibujan los kilos de un panel. Los colores van por tipo de cifra y no por gráfico, para
// que «baba» sea del mismo color en todas partes.
export const KG_COLORS = {
  green: 'var(--cobre)',
  dry: 'var(--selva-2)',
  sold: 'var(--hoja)',
} as const;

export const GRADE_COLORS = {
  g1: 'var(--hoja)',
  g2: 'var(--amarillo-mazorca)',
  discard: 'var(--err)',
} as const;

type MonthRow = { month: string } & Record<string, string>;

// Un grupo por mes del periodo (el servidor manda también los que no tienen datos), con los kilos
// de cada serie como número.
export function monthGroups(
  months: readonly MonthRow[],
  keys: readonly string[],
): ColumnGroup[] {
  return months.map(({ month, ...kg }, index) => ({
    key: month,
    tick: monthTick(month, index === 0),
    title: formatMonthYear(month),
    values: Object.fromEntries(keys.map((key) => [key, Number(kg[key] ?? 0)])),
  }));
}

// G1, G2 y descarte de lo clasificado o descartado, cada uno con su porcentaje.
export function qualitySegments(quality: QualitySplit): ShareSegment[] {
  const parts = [
    ['g1', 'G1', quality.g1_pct, quality.g1_kg],
    ['g2', 'G2', quality.g2_pct, quality.g2_kg],
    ['discard', 'Descarte', quality.discard_pct, quality.discard_kg],
  ] as const;
  return parts.map(([key, label, percent, kg]) => ({
    key,
    label,
    percent: percent === null ? null : Number(percent),
    percentLabel: formatShare(percent),
    valueLabel: formatKg(kg),
    color: GRADE_COLORS[key],
  }));
}

// Lo que hay hoy en bodega por calibre.
export function stockBars(
  inventory: ProducerIndicators['inventory'],
): BarRow[] {
  return [
    {
      key: 'g1',
      label: 'G1',
      value: Number(inventory.g1_kg),
      valueLabel: formatKg(inventory.g1_kg),
    },
    {
      key: 'g2',
      label: 'G2',
      value: Number(inventory.g2_kg),
      valueLabel: formatKg(inventory.g2_kg),
    },
  ];
}

// Lo que hay en bodega en cada finca, con su reparto por calibre debajo.
export function farmStockBars(farms: readonly FarmStock[]): BarRow[] {
  return farms.map((farm) => {
    const total = Number(farm.g1_kg) + Number(farm.g2_kg);
    return {
      key: farm.farm_id,
      label: farmLabel({ code: farm.farm_code, name: farm.farm_name }),
      value: total,
      valueLabel: formatKg(total.toFixed(1)),
      detail: `G1 ${formatKg(farm.g1_kg)} · G2 ${formatKg(farm.g2_kg)}`,
    };
  });
}

// Un panel sin una sola cifra no es un panel de ceros: es un estado vacío.
export function hasProducerFigures(data: ProducerIndicators): boolean {
  return (
    data.production.plots.length > 0 ||
    Number(data.production.green_kg) > 0 ||
    Number(data.quality.classified_kg) > 0 ||
    Number(data.inventory.total_kg) > 0 ||
    Number(data.sales.sold_kg) > 0
  );
}

export const hasAssociationFigures = (data: AssociationIndicators) =>
  data.farms.length > 0;
