import type { ScatterPoint } from '@/components/charts/scatter-chart';

import type { AssociationFarm, AssociationIndicators } from './api';
import { GRADE_COLORS } from './indicator-charts';

// Qué se compara en el plano: los kilos de x y el reparto de calidad de y. Lo vendido solo lo tienen
// las fincas: una variedad no se vende, se vende un lote.
export type ScatterX = 'green' | 'dry' | 'sold';
export type ScatterY = 'g1' | 'g2' | 'discard';
export type ScatterBy = 'farm' | 'variety';

export const SCATTER_X_OPTIONS: readonly {
  value: ScatterX;
  label: string;
  axis: string;
}[] = [
  { value: 'green', label: 'En baba', axis: 'Kg en baba' },
  { value: 'dry', label: 'Seco', axis: 'Kg secos' },
  { value: 'sold', label: 'Vendido', axis: 'Kg vendidos' },
];

export const SCATTER_Y_OPTIONS: readonly {
  value: ScatterY;
  label: string;
  axis: string;
}[] = [
  { value: 'g1', label: 'G1', axis: '% de G1' },
  { value: 'g2', label: 'G2', axis: '% de G2' },
  { value: 'discard', label: 'Descarte', axis: '% de descarte' },
];

export const SCATTER_BY_OPTIONS: readonly {
  value: ScatterBy;
  label: string;
}[] = [
  { value: 'farm', label: 'Fincas' },
  { value: 'variety', label: 'Variedades' },
];

// Lo que se necesita de una finca o de una variedad para ponerla en el plano.
export type ScatterSource = {
  key: string;
  label: string;
  green_kg: string;
  dry_kg: string;
  sold_kg: string | null;
  classified_kg: string;
  g1_pct: string | null;
  g2_pct: string | null;
  discard_pct: string | null;
};

export const farmSources = (
  farms: readonly AssociationFarm[],
): ScatterSource[] =>
  farms.map((farm) => ({ ...farm, key: farm.farm_id, label: farm.farm_name }));

export const varietySources = (
  varieties: AssociationIndicators['varieties'],
): ScatterSource[] =>
  varieties.map((variety) => ({
    ...variety,
    key: variety.variety_id,
    label: variety.variety_name,
    sold_kg: null,
  }));

const KG = { green: 'green_kg', dry: 'dry_kg', sold: 'sold_kg' } as const;
const PCT = {
  g1: 'g1_pct',
  g2: 'g2_pct',
  discard: 'discard_pct',
} as const;

// Cuánto descarte se pinta de rojo.
const HIGH_DISCARD_PCT = 10;

// Cada fila con calidad es un punto: los kilos de `x` en x, el porcentaje de `y` en y y, de tamaño,
// lo vendido (o, sin ventas, lo clasificado). Una fila sin nada clasificado no tiene porcentaje: no
// se dibuja, se cuenta aparte para decirlo.
export function scatterPoints(
  sources: readonly ScatterSource[],
  x: ScatterX,
  y: ScatterY,
) {
  const points: ScatterPoint[] = [];
  const unclassified: ScatterSource[] = [];
  for (const source of sources) {
    const share = source[PCT[y]];
    if (share === null) {
      unclassified.push(source);
      continue;
    }
    points.push({
      key: source.key,
      label: source.label,
      x: Number(source[KG[x]] ?? 0),
      y: Number(share),
      size: Number(source.sold_kg ?? source.classified_kg),
      color:
        Number(source.discard_pct ?? 0) >= HIGH_DISCARD_PCT
          ? GRADE_COLORS.discard
          : GRADE_COLORS.g1,
    });
  }
  return { points, unclassified };
}

// Las líneas del promedio: los kilos medios de las filas y el porcentaje de toda la asociación.
export function scatterAverages(
  sources: readonly ScatterSource[],
  totals: AssociationIndicators['totals'],
  x: ScatterX,
  y: ScatterY,
) {
  const kg = sources.reduce(
    (sum, source) => sum + Number(source[KG[x]] ?? 0),
    0,
  );
  return {
    x: sources.length > 0 ? kg / sources.length : 0,
    y: Number(totals[PCT[y]] ?? 0),
  };
}
