import { farmLabel, plotLabel } from '@/lib/format/place-label';

import type { Harvest } from './api';

// Lo que cosechas entrega a quien conforma el lote: los lotes son de otro dominio, y la página que
// monta la pantalla los une.
export type HarvestLotSource = {
  harvestId: string;
  plot: string;
  farm: string;
  harvestDate: string;
  greenWeightKg: string;
  variety: string;
};

export const lotSourceOfHarvest = (harvest: Harvest): HarvestLotSource => ({
  harvestId: harvest.id,
  plot: plotLabel(harvest.plot),
  farm: farmLabel(harvest.plot.farm),
  harvestDate: harvest.harvest_date,
  greenWeightKg: harvest.green_weight_kg,
  variety: harvest.variety.name,
});
