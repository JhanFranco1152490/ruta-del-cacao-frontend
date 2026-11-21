import { lotStatusLabel } from '@/lib/lot-status';
import { kilosText } from '@/lib/stock-quantity';

import type { LotHistory } from '../api';

// La foto de hoy que cierra la historia: «Estado actual: En bodega · 12,5 kg de G1 y 7,5 kg de G2
// disponibles · 20,0 kg vendidos». Antes de la bodega el servidor no manda kilos, y solo se dice el
// estado. Los kilos se muestran como llegan: las ventas anuladas ya no cuentan.
export function currentStateText({
  status,
  g1_available_kg,
  g2_available_kg,
  sold_kg,
}: LotHistory['current']) {
  const parts = [`Estado actual: ${lotStatusLabel(status)}`];
  if (g1_available_kg !== null && g2_available_kg !== null) {
    const nothingLeft =
      Number(g1_available_kg) === 0 && Number(g2_available_kg) === 0;
    parts.push(
      nothingLeft
        ? 'sin cacao disponible'
        : `${kilosText(g1_available_kg)} kg de G1 y ${kilosText(g2_available_kg)} kg de G2 disponibles`,
    );
  }
  if (sold_kg !== null && Number(sold_kg) > 0) {
    parts.push(`${kilosText(sold_kg)} kg vendidos`);
  }
  return parts.join(' · ');
}
