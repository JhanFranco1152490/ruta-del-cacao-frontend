import { producerLabelOf } from '@/lib/format/producer';

import type { OverviewFarm, OverviewPlot } from './plot-overview';
import type { Grouping } from './use-plot-filters';

export type SectionHeader = {
  level: 'device' | 'producer' | 'farm';
  label: string;
  // El grupo empezó en la página anterior.
  continues: boolean;
};

// Un tramo de la lista: los encabezados que lo abren y sus parcelas.
export type PlotSection = {
  key: string;
  headers: SectionHeader[];
  plots: OverviewPlot[];
};

export const DEVICE_GROUP_LABEL = 'En este dispositivo';
const PENDING_FARM_LABEL = 'Finca pendiente de sincronizar';

const producerKey = (farm: OverviewFarm) => farm.producer?.id ?? '';

// Parte la página en grupos. La lista ya llega en el orden de los grupos (el servidor ordena por
// productor, finca y código), así que basta con abrir un grupo donde cambia: sin reordenar nada,
// una parcela nunca cambia de página. Lo que espera en el dispositivo va antes, en su propio
// grupo. `before` es la última parcela de la página anterior: si es del mismo grupo que la
// primera de esta, el encabezado lo dice.
export function sectionPlots(
  plots: readonly OverviewPlot[],
  grouping: Grouping,
  {
    byProducer,
    before,
  }: { byProducer: boolean; before?: Pick<OverviewPlot, 'farm'> | null },
): PlotSection[] {
  const sections: PlotSection[] = [];
  const local = plots.filter((plot) => plot.queue);
  const server = plots.filter((plot) => !plot.queue);
  if (local.length) {
    sections.push({
      key: 'device',
      headers: [
        { level: 'device', label: DEVICE_GROUP_LABEL, continues: false },
      ],
      plots: local,
    });
  }
  if (!server.length) return sections;
  if (grouping === 'ninguno') {
    sections.push({ key: 'all', headers: [], plots: [...server] });
    return sections;
  }

  const showProducer = grouping === 'productor' || byProducer;
  const showFarm = grouping === 'finca';
  let current: PlotSection | undefined;
  let producer: string | undefined;
  let farm: string | undefined;
  for (const plot of server) {
    const first = current === undefined;
    const newProducer = showProducer && producerKey(plot.farm) !== producer;
    const newFarm = showFarm && (plot.farm.id !== farm || newProducer);
    const headers: SectionHeader[] = [];
    if (newProducer) {
      headers.push({
        level: 'producer',
        label: plot.farm.producer
          ? producerLabelOf(plot.farm.producer)
          : 'Productor sin nombre',
        continues:
          first &&
          !!before &&
          producerKey(before.farm) === producerKey(plot.farm),
      });
    }
    if (newFarm) {
      headers.push({
        level: 'farm',
        label: plot.farm.name ?? PENDING_FARM_LABEL,
        continues: first && !!before && before.farm.id === plot.farm.id,
      });
    }
    if (!current || headers.length) {
      current = { key: `${plot.farm.id}:${plot.id}`, headers, plots: [] };
      sections.push(current);
    }
    current.plots.push(plot);
    producer = producerKey(plot.farm);
    farm = plot.farm.id;
  }
  return sections;
}
