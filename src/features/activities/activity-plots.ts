import type { ActivityOfDay } from './activity-days';
import type { AgriculturalActivity } from './api';

type PlotOfActivity = AgriculturalActivity['plot'];

export type PlotRow = { plot: PlotOfActivity; activities: ActivityOfDay[] };
export type FarmRows = {
  farmId: string;
  farmName: string;
  plots: PlotRow[];
};

// Las actividades de cada parcela, las parcelas de cada finca: la vista por parcela. Solo salen
// las parcelas que tienen alguna. Las fincas van por nombre, las parcelas por código y las
// actividades de la más próxima en el tiempo a la más lejana.
export function groupActivitiesByPlot(
  items: readonly ActivityOfDay[],
): FarmRows[] {
  const farms = new Map<string, FarmRows>();
  for (const item of items) {
    const { plot } = item.activity;
    const farm = farms.get(plot.farm.id) ?? {
      farmId: plot.farm.id,
      farmName: plot.farm.name,
      plots: [],
    };
    let row = farm.plots.find(({ plot: known }) => known.id === plot.id);
    if (!row) {
      row = { plot, activities: [] };
      farm.plots.push(row);
    }
    row.activities.push(item);
    farms.set(plot.farm.id, farm);
  }
  return [...farms.values()]
    .map((farm) => ({
      ...farm,
      plots: farm.plots
        .map((row) => ({
          ...row,
          activities: row.activities.toSorted((a, b) =>
            a.activity.scheduled_date.localeCompare(b.activity.scheduled_date),
          ),
        }))
        .toSorted((a, b) => a.plot.code.localeCompare(b.plot.code)),
    }))
    .toSorted((a, b) => a.farmName.localeCompare(b.farmName));
}
