import { formatDecimal } from '@/lib/format/decimal';
import { formatLongDate } from '@/lib/format/dates';

// La cosecha con la que se conforma un lote, como la entrega quien abre el diálogo.
export type LotSource = {
  harvestId: string;
  // "P05 · Lote del río" y "F02 · La Esperanza".
  plot: string;
  farm: string;
  harvestDate: string;
  greenWeightKg: string;
  variety: string;
};

export const lotSourceSummary = (source: LotSource) =>
  `Vas a conformar un lote con la cosecha de ${source.plot} (${source.farm}) del ${formatLongDate(source.harvestDate)}: ${formatDecimal(source.greenWeightKg, 1)} kg en verde de ${source.variety}. El código se asigna ahora y no se puede cambiar.`;
