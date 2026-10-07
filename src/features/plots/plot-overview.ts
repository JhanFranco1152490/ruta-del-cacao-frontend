import type { ProducerRef } from '@/lib/format/producer';
import { matchesSearch } from '@/lib/format/search';

import type { Plot } from './api';
import { fromServer, type KnownPlot, toQueue } from './known-plots';
import type { QueuedPlot } from './plot-queue';

// La finca de una parcela tal como la conoce la pantalla general. De una parcela que solo está en
// el dispositivo puede no saberse el nombre (su finca también puede estar pendiente).
export type OverviewFarm = {
  id: string;
  name?: string;
  isActive: boolean;
  producer?: ProducerRef;
};

export type OverviewPlot = KnownPlot & { farm: OverviewFarm };

export type OverviewFilters = {
  search?: string;
  farm?: string;
  // Solo la cuenta técnica filtra por productor.
  producer?: string;
};

export type KnownFarms = ReadonlyMap<string, Omit<OverviewFarm, 'id'>>;

const farmOf = (plot: Plot): OverviewFarm => ({
  id: plot.farm.id,
  name: plot.farm.name,
  isActive: plot.farm.is_active,
  producer: plot.farm.producer,
});

const byCode = (a: KnownPlot, b: KnownPlot) =>
  a.code.localeCompare(b.code, 'es', { sensitivity: 'base' });

// Lo del dispositivo va primero (necesita atención o aún no llega) y reemplaza a su copia del
// servidor, como en la lista de fincas: una edición pendiente muestra los datos nuevos. La página
// del servidor ya viene filtrada; lo del dispositivo se filtra aquí con los mismos criterios.
// `knownFarms` son las fincas del filtro: dan el nombre de la finca de una parcela nueva y, con
// un productor elegido, dicen si la parcela es de él.
export function mergeOverviewPlots(
  server: readonly Plot[],
  queued: readonly QueuedPlot[],
  filters: OverviewFilters,
  knownFarms: KnownFarms,
): OverviewPlot[] {
  const serverById = new Map(server.map((plot) => [plot.id, plot]));
  const local = queued
    .filter(
      (plot) =>
        (!filters.farm || plot.farmId === filters.farm) &&
        (!filters.producer ||
          serverById.has(plot.id) ||
          knownFarms.has(plot.farmId)) &&
        matchesSearch([plot.values.code], filters.search ?? ''),
    )
    .map((plot): OverviewPlot => {
      const copy = serverById.get(plot.id);
      return {
        // Una parcela nueva nace activa; de una edición se conservan estado y versión.
        ...(copy ? fromServer(copy) : { isActive: true }),
        id: plot.id,
        code: plot.values.code,
        areaHectares: plot.values.area_hectares,
        vertices: plot.values.vertices,
        queue: toQueue(plot),
        farm: copy
          ? farmOf(copy)
          : { id: plot.farmId, isActive: true, ...knownFarms.get(plot.farmId) },
      };
    })
    .sort(byCode);
  const localIds = new Set(queued.map((plot) => plot.id));
  const rest = server
    .filter((plot) => !localIds.has(plot.id))
    .map((plot): OverviewPlot => ({ ...fromServer(plot), farm: farmOf(plot) }));
  return [...local, ...rest];
}
