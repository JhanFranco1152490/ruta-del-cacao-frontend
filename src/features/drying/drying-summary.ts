import { formatFixedDecimal } from '@/lib/format/decimal';

import type { Drying } from './api';

// La línea de la etapa en la lista: la marquesina y, en curso, las bitácoras; terminado, los días, el
// peso seco y el rendimiento.
export function dryingSummary(drying: Drying) {
  const { result } = drying;
  if (!result) {
    const logs = drying.logs.length;
    return [
      drying.facility.name,
      'En curso',
      logs === 1 ? '1 bitácora' : `${logs} bitácoras`,
    ].join(' · ');
  }
  return [
    drying.facility.name,
    result.days === 1 ? '1 día' : `${result.days} días`,
    `${formatFixedDecimal(result.dry_weight_kg, 1)} kg secos`,
    `${formatFixedDecimal(result.yield_pct, 1)} % de rendimiento`,
  ].join(' · ');
}
