import type { PlotOption } from '@/lib/api/plot-options';
import type { components } from '@/lib/api/schema';
import { formatHectares } from '@/lib/format/hectares';
import { farmLabel, plotLabel } from '@/lib/format/place-label';
import { producerLabelOf } from '@/lib/format/producer';

import { type VarietyChoice, varietiesOfPlot } from './harvest-rules';

type PlotCharacterization = components['schemas']['PlotCharacterization'];

export const NOT_CHARACTERIZED_DETAIL =
  'Sin siembras en su ficha: no se puede cosechar todavía';

// Una parcela tal como la ofrece el formulario de cosecha: con su finca como grupo, su área y sus
// variedades como detalle, o deshabilitada y con el motivo si su ficha no tiene siembras.
export type HarvestPlotChoice = {
  id: string;
  label: string;
  group: string;
  description: string;
  disabled: boolean;
  areaHectares: string;
  farmId: string;
  // "F02 · La Esperanza", sin el productor que el grupo agrega para la cuenta técnica.
  farm: string;
  producerId: string;
  varieties: VarietyChoice[];
  // Su ficha tiene una edición esperando en la cola: las variedades son las de la última copia.
  characterizationPending: boolean;
};

// `showProducer`: la cuenta técnica ve parcelas de varios productores y el grupo dice de quién es
// cada finca. El orden es el del servidor (productor, finca y código).
export function harvestPlotChoices({
  plots,
  characterizations,
  pendingCharacterizations,
  showProducer,
}: {
  plots: readonly PlotOption[];
  characterizations: readonly PlotCharacterization[];
  pendingCharacterizations: ReadonlySet<string>;
  showProducer: boolean;
}): HarvestPlotChoice[] {
  const plantingsOf = new Map(
    characterizations.map(({ plot_id, plantings }) => [plot_id, plantings]),
  );
  return plots.map((plot) => {
    const varieties = varietiesOfPlot(plantingsOf.get(plot.id) ?? []);
    const disabled = varieties.length === 0;
    const farm = farmLabel(plot.farm);
    return {
      id: plot.id,
      label: plotLabel(plot),
      group: showProducer
        ? `${farm} · ${producerLabelOf(plot.farm.producer)}`
        : farm,
      description: disabled
        ? NOT_CHARACTERIZED_DETAIL
        : `${formatHectares(plot.areaHectares)} · ${varieties.map(({ name }) => name).join(', ')}`,
      disabled,
      areaHectares: plot.areaHectares,
      farmId: plot.farm.id,
      farm,
      producerId: plot.farm.producer.id,
      varieties,
      characterizationPending: pendingCharacterizations.has(plot.id),
    };
  });
}
