import { farmLabel, plotLabel } from '@/lib/format/place-label';
import type { QueueStatus } from '@/lib/offline/db';

import type { Harvest } from './api';
import { filterHarvests, type HarvestFilters } from './harvest-filters';
import {
  type HarvestLotSource,
  lotSourceOfHarvest,
} from './harvest-lot-source';
import type { QueuedHarvest } from './harvest-queue';

// Una fila de la lista del mes: una cosecha del servidor o una que espera en el teléfono. La que
// espera solo trae lo que se capturó (ids) y su etiqueta; los nombres llegan cuando se envía.
export type HarvestRow = {
  id: string;
  date: string;
  plot: string;
  farm: string | null;
  variety: string | null;
  collector: string | null;
  weightKg: string;
  lotCode: string | null;
  // Una que todavía no forma un lote (del servidor, o del teléfono si lo trae): con qué conformarlo.
  lotSource?: HarvestLotSource;
  // Solo las del teléfono: esperando conexión o rechazada por el servidor.
  queue?: Exclude<QueueStatus, 'synced'>;
};

const serverRow = (harvest: Harvest): HarvestRow => ({
  id: harvest.id,
  date: harvest.harvest_date,
  plot: plotLabel(harvest.plot),
  farm: farmLabel(harvest.plot.farm),
  variety: harvest.variety.name,
  collector: harvest.collector.full_name,
  weightKg: harvest.green_weight_kg,
  lotCode: harvest.lot?.code ?? null,
  lotSource: harvest.lot ? undefined : lotSourceOfHarvest(harvest),
});

// La etiqueta de la cola dice parcela y fecha ("P05 · Lote del río · 22 oct."): la parcela es lo
// que va antes de la última parte.
const plotOfLabel = (label: string) =>
  label.split(' · ').slice(0, -1).join(' · ') || label;

// Las del teléfono que caen en el mes y cumplen los filtros que se pueden comprobar con lo
// capturado. Ninguna está todavía en un lote. La finca solo se sabe si otra cosecha del mes es de
// la misma parcela.
function queuedRows(
  queued: readonly QueuedHarvest[],
  month: string,
  harvests: readonly Harvest[],
  filters: HarvestFilters,
): HarvestRow[] {
  const farmOfPlot = new Map(
    harvests.map(({ plot }) => [plot.id, plot.farm.id]),
  );
  const serverIds = new Set(harvests.map(({ id }) => id));
  return queued
    .filter(({ id, request, status }) => {
      if (serverIds.has(id) || status === 'synced') return false;
      if (!request.harvest_date.startsWith(month)) return false;
      if (filters.lot === 'with') return false;
      if (filters.farm && farmOfPlot.get(request.plot_id) !== filters.farm) {
        return false;
      }
      return (
        (!filters.plot || request.plot_id === filters.plot) &&
        (!filters.variety || request.variety_id === filters.variety) &&
        (!filters.collector || request.collector_id === filters.collector)
      );
    })
    .map(({ id, request, label, status, lotSource }) => ({
      id,
      date: request.harvest_date,
      plot: plotOfLabel(label),
      farm: null,
      variety: null,
      collector: null,
      weightKg: request.green_weight_kg,
      lotCode: null,
      // Su lote se puede conformar ya, sin esperar a que la cosecha llegue.
      lotSource: status === 'error' ? undefined : lotSource,
      queue: status === 'error' ? 'error' : 'pending',
    }));
}

// Lo que se ve del mes: lo que espera en el teléfono y lo del servidor, de la más reciente a la
// más antigua.
export const harvestRows = ({
  harvests,
  queued,
  month,
  filters,
}: {
  harvests: readonly Harvest[];
  queued: readonly QueuedHarvest[];
  month: string;
  filters: HarvestFilters;
}): HarvestRow[] =>
  [
    ...queuedRows(queued, month, harvests, filters),
    ...filterHarvests(harvests, filters).map(serverRow),
  ].toSorted((a, b) => b.date.localeCompare(a.date));

type Option = { id: string; label: string };

const uniqueBy = (options: Option[]) => [
  ...new Map(options.map((option) => [option.id, option])).values(),
];

// Lo que ofrece cada filtro: lo que aparece en las cosechas del mes.
export function harvestFilterOptions(harvests: readonly Harvest[]) {
  const byLabel = (a: Option, b: Option) =>
    a.label.localeCompare(b.label, 'es');
  return {
    farms: uniqueBy(
      harvests.map(({ plot }) => ({
        id: plot.farm.id,
        label: farmLabel(plot.farm),
      })),
    ).toSorted(byLabel),
    plots: uniqueBy(
      harvests.map(({ plot }) => ({ id: plot.id, label: plotLabel(plot) })),
    ).toSorted((a, b) =>
      a.label.localeCompare(b.label, 'es', { numeric: true }),
    ),
    varieties: uniqueBy(
      harvests.map(({ variety }) => ({ id: variety.id, label: variety.name })),
    ).toSorted(byLabel),
    collectors: uniqueBy(
      harvests.map(({ collector }) => ({
        id: collector.id,
        label: collector.full_name,
      })),
    ).toSorted(byLabel),
    // Para encontrar la finca de una parcela al filtrar.
    farmOfPlot: new Map(harvests.map(({ plot }) => [plot.id, plot.farm.id])),
  };
}
