import type { components } from '@/lib/api/schema';

import type { HarvestFormValues } from './harvest-rules';

// Del formulario a lo que pide la API, y de una cosecha del servidor al formulario para corregirla.

type Schemas = components['schemas'];
export type HarvestCreateRequest = Schemas['HarvestCreateRequest'];

export const toHarvestRequest = (
  values: HarvestFormValues,
  id: string,
): HarvestCreateRequest & { id: string } => ({
  id,
  plot_id: values.plot_id,
  harvest_date: values.harvest_date,
  green_weight_kg: values.green_weight_kg,
  variety_id: values.variety_id,
  collector_id: values.collector_id,
});

type ServerHarvest = Schemas['Harvest'];

// Los valores del formulario a partir de una cosecha del servidor, para corregirla.
export const harvestToFormValues = (
  harvest: ServerHarvest,
): HarvestFormValues => ({
  plot_id: harvest.plot.id,
  harvest_date: harvest.harvest_date,
  green_weight_kg: harvest.green_weight_kg,
  variety_id: harvest.variety.id,
  collector_id: harvest.collector.id,
});

// Solo lo que cambió, con la versión leída: el servidor valida la variedad y el recolector solo si
// cambian, y así una cosecha cuyo recolector dejó de cumplir se corrige en el peso sin tocarlo. La
// parcela no se cambia. El peso se compara como número ("120.50" y "120.5" son el mismo).
export function toHarvestUpdate(
  values: HarvestFormValues,
  harvest: ServerHarvest,
): Schemas['PatchedHarvestUpdateRequest'] {
  const current = harvestToFormValues(harvest);
  return {
    expected_version: harvest.version,
    ...(values.harvest_date !== current.harvest_date && {
      harvest_date: values.harvest_date,
    }),
    ...(Number(values.green_weight_kg) !== Number(current.green_weight_kg) && {
      green_weight_kg: values.green_weight_kg,
    }),
    ...(values.variety_id !== current.variety_id && {
      variety_id: values.variety_id,
    }),
    ...(values.collector_id !== current.collector_id && {
      collector_id: values.collector_id,
    }),
  };
}
