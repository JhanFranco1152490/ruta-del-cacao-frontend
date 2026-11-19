import { discardReasonText } from '@/lib/discard-reasons';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../api';

type Classification = StageOf<'classification'>['classification'];
type Discard = StageOf<'discard'>['discard'];

const share = (kg: string, pct: string | null, label: string) =>
  pct === null
    ? `${kilosText(kg)} kg ${label}`
    : `${kilosText(kg)} kg ${label} (${formatFixedDecimal(pct, 1)} %)`;

// Lo que dio la clasificación: «32,5 kg G1 (72,2 %) · 8,0 kg G2 (17,8 %)». Sin peso seco el
// servidor no calcula el porcentaje y se dicen solo los kilos.
export const gradesText = (classification: Classification) =>
  [
    share(classification.g1_kg, classification.g1_pct, 'G1'),
    share(classification.g2_kg, classification.g2_pct, 'G2'),
  ].join(' · ');

// El descarte parcial de una clasificación, «Descarte: 4,5 kg por Moho», o nada si no hubo.
export function partialDiscardText(classification: Classification) {
  const { discard_kg, discard_reason, discard_detail } = classification;
  if (!discard_reason || Number(discard_kg) === 0) return null;
  return `Descarte: ${kilosText(discard_kg)} kg por ${discardReasonText(discard_reason, discard_detail)}`;
}

// El descarte del lote completo: «Lote descartado: Moho · 45,0 kg».
export const fullDiscardText = ({ reason, detail, quantity_kg }: Discard) =>
  `Lote descartado: ${discardReasonText(reason, detail)} · ${kilosText(quantity_kg)} kg`;
