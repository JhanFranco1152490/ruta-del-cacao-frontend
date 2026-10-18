import { formatDecimal } from '@/lib/format/decimal';
import { formatLongDate, formatAbbreviatedDate } from '@/lib/format/dates';

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

const originText = (source: LotSource) =>
  `la cosecha de ${source.plot} (${source.farm}) del ${formatLongDate(source.harvestDate)}: ${formatDecimal(source.greenWeightKg, 1)} kg en verde de ${source.variety}`;

export const lotSourceSummary = (source: LotSource) =>
  `Vas a conformar un lote con ${originText(source)}. El código se asigna ahora y no se puede cambiar.`;

// Sin conexión, o con la cosecha todavía en el teléfono, el lote también se guarda primero en el
// dispositivo: no hay código hasta que llegue al servidor, y entonces sale un aviso con el que
// quedó.
export const queuedLotSummary = (source: LotSource) =>
  `Vas a conformar un lote con ${originText(source)}. Se guarda en este teléfono y recibe su código cuando llegue al servidor; el código no se puede cambiar.`;

// Cómo se nombra el lote en la bandeja, que no puede mostrar un código que todavía no existe.
export const queuedLotLabel = (
  source: Pick<LotSource, 'plot' | 'harvestDate'>,
) => `Lote de ${source.plot} · ${formatAbbreviatedDate(source.harvestDate)}`;
