import type { PlotProduction, ProducerIndicators } from './api';
import { formatDecimal } from '@/lib/format/decimal';
import { formatKg } from './indicator-format';
import { plotLabel } from '@/lib/format/place-label';

export type Insight = { key: string; tone: 'warn' | 'ok'; text: string };

// Cuánto menos que el promedio tiene que rendir una parcela para señalarla.
const LOW_YIELD_SHARE = 0.7;
// Desde qué porcentaje de descarte se avisa.
const HIGH_DISCARD_PCT = 10;

// Las parcelas activas que cosecharon en el periodo: una que no cosechó no rinde poco, no tuvo
// cosecha, y sin área no hay kg por hectárea.
const withYield = (plots: readonly PlotProduction[]) =>
  plots.filter(
    (plot) =>
      plot.is_active &&
      plot.green_kg_per_hectare !== null &&
      Number(plot.green_kg) > 0,
  );

// La parcela que más se aleja por debajo del promedio de las demás, si se aleja lo suficiente.
export function lowestYieldPlot(
  production: ProducerIndicators['production'],
): { plot: PlotProduction; belowPercent: number } | null {
  const plots = withYield(production.plots);
  const average = Number(production.green_kg_per_hectare);
  if (plots.length < 2 || !(average > 0)) return null;
  const lowest = plots.reduce((min, plot) =>
    Number(plot.green_kg_per_hectare) < Number(min.green_kg_per_hectare)
      ? plot
      : min,
  );
  const ratio = Number(lowest.green_kg_per_hectare) / average;
  if (ratio >= LOW_YIELD_SHARE) return null;
  return { plot: lowest, belowPercent: Math.round((1 - ratio) * 100) };
}

// Lo que el productor debe mirar, en frases: lo que espera atención primero y lo que va bien después.
// Cada regla calla si no tiene de qué hablar, así que un panel sin novedades no trae frases.
export function producerInsights(data: ProducerIndicators): Insight[] {
  const insights: Insight[] = [];
  const { production, quality, inventory } = data;
  if (Number(production.green_kg_not_dried) > 0) {
    insights.push({
      key: 'not-dried',
      tone: 'warn',
      text: `${formatKg(production.green_kg_not_dried)} cosechados siguen sin secar.`,
    });
  }
  const low = lowestYieldPlot(production);
  if (low) {
    insights.push({
      key: 'low-yield',
      tone: 'warn',
      text: `${plotLabel({ code: low.plot.plot_code, name: low.plot.plot_name })} rinde ${low.belowPercent} % menos por hectárea que el promedio de tus parcelas.`,
    });
  }
  if (quality.discard_pct !== null) {
    const discard = Number(quality.discard_pct);
    insights.push(
      discard >= HIGH_DISCARD_PCT
        ? {
            key: 'discard',
            tone: 'warn',
            text: `El descarte es de ${formatDecimal(discard, 1)} % de lo clasificado.`,
          }
        : {
            key: 'discard',
            tone: 'ok',
            text: `El descarte es de solo ${formatDecimal(discard, 1)} % de lo clasificado.`,
          },
    );
  }
  if (Number(inventory.total_kg) === 0 && Number(data.sales.sold_kg) > 0) {
    insights.push({
      key: 'empty-stock',
      tone: 'ok',
      text: 'Lo clasificado ya se vendió: no queda cacao en bodega.',
    });
  }
  return insights;
}
