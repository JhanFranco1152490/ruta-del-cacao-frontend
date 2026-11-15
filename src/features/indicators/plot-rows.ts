import type { PlotProduction } from './api';

export type PlotRow = {
  plot: PlotProduction;
  // Cuánto se aleja el rendimiento por hectárea del promedio, en %; `null` si no se puede comparar
  // (sin cosecha en el periodo o sin área).
  versusAverage: number | null;
  // La mejor o la más baja de las comparables.
  extreme: 'best' | 'lowest' | null;
};

// Las parcelas de la más a la menos productiva por hectárea, cada una comparada con el promedio de
// la unidad. Las que no tienen área quedan al final, sin comparar.
export function plotRows(
  plots: readonly PlotProduction[],
  averagePerHectare: string | null,
): PlotRow[] {
  const average = Number(averagePerHectare);
  // Una parcela sin cosecha en el periodo no rinde poco: no se compara.
  const comparable = (plot: PlotProduction) =>
    plot.green_kg_per_hectare !== null &&
    Number(plot.green_kg) > 0 &&
    average > 0;
  const rows = plots.map((plot) => ({
    plot,
    versusAverage: comparable(plot)
      ? Math.round((Number(plot.green_kg_per_hectare) / average - 1) * 100)
      : null,
  }));
  rows.sort(
    (a, b) =>
      Number(b.plot.green_kg_per_hectare ?? -1) -
      Number(a.plot.green_kg_per_hectare ?? -1),
  );
  const compared = rows.filter(({ versusAverage }) => versusAverage !== null);
  return rows.map((row) => ({
    ...row,
    extreme:
      compared.length < 2
        ? null
        : row === compared[0]
          ? 'best'
          : row === compared[compared.length - 1]
            ? 'lowest'
            : null,
  }));
}
