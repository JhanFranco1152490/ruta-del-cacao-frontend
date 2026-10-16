import { assignableIn } from '@/lib/assignable-accounts';
import { formatDecimal } from '@/lib/format/decimal';
import { formatShortDate } from '@/lib/format/dates';

import type { CollectorOption } from './api';
import type { HarvestPlotChoice } from './harvest-plots';
import type { QueuedHarvest } from './harvest-queue';
import type { HarvestFormValues, VarietyChoice } from './harvest-rules';

export type HarvestFormInput = HarvestFormValues;

// Lo que conserva "Registrar otra cosecha": en campo se registran varias recolecciones seguidas
// de la misma parcela, con el mismo recolector y el mismo día.
export type KeptHarvestFields = Pick<
  HarvestFormInput,
  'plot_id' | 'collector_id' | 'harvest_date'
>;

export const emptyHarvestForm = (
  today: string,
  kept: Partial<KeptHarvestFields> = {},
): HarvestFormInput => ({
  plot_id: kept.plot_id ?? '',
  harvest_date: kept.harvest_date ?? today,
  green_weight_kg: '',
  variety_id: '',
  collector_id: kept.collector_id ?? '',
});

// Quienes pueden recolectar en la finca de la parcela, como opciones del formulario.
export const collectorChoices = (
  collectors: readonly CollectorOption[],
  farmId: string,
) =>
  assignableIn(collectors, farmId).map(({ id, full_name }) => ({
    id,
    label: full_name,
  }));

// Con una sola variedad en la ficha no hay nada que elegir.
export const onlyVariety = (varieties: readonly VarietyChoice[]) =>
  varieties.length === 1 ? varieties[0].id : '';

// Cómo se nombra la cosecha en la bandeja del dispositivo: "P05 · Lote del río · 14 oct.".
export const harvestQueueLabel = (plotLabel: string, harvestDate: string) =>
  `${plotLabel} · ${formatShortDate(harvestDate)}`;

// El resumen de lo guardado: "117 kg de CCN-51 · P02 · La loma · 22 oct.".
export const harvestSummary = (
  values: Pick<HarvestFormInput, 'green_weight_kg' | 'harvest_date'>,
  varietyName: string,
  plot: Pick<HarvestPlotChoice, 'label'>,
) =>
  `${formatDecimal(values.green_weight_kg, 1)} kg de ${varietyName} · ${harvestQueueLabel(plot.label, values.harvest_date)}`;

// Un formulario nuevo, con lo que se conserva y, si su parcela tiene una sola variedad, ya elegida.
export function startForm(
  today: string,
  plots: readonly HarvestPlotChoice[],
  kept: Partial<KeptHarvestFields> = {},
): HarvestFormInput {
  const values = emptyHarvestForm(today, kept);
  const plot = plots.find(({ id }) => id === values.plot_id);
  return { ...values, variety_id: plot ? onlyVariety(plot.varieties) : '' };
}

export const formOfRequest = (
  request: QueuedHarvest['request'],
): HarvestFormInput => ({
  plot_id: request.plot_id,
  harvest_date: request.harvest_date,
  green_weight_kg: request.green_weight_kg,
  variety_id: request.variety_id,
  collector_id: request.collector_id,
});
