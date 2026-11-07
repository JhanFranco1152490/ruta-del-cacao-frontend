import { dateInBogota } from '@/lib/format/dates';

import type { LotQuality } from './api';

// El momento en que se cerró el lote: la clasificación o el descarte, el que tenga.
export const closedAt = (lot: LotQuality) =>
  lot.classification?.classified_at ?? lot.discard?.discarded_at ?? null;

export type ClosingMonth = { month: string; lots: LotQuality[] };

// Parte los lotes cerrados de una página en meses de cierre (yyyy-MM, en la hora de Bogotá), en el
// orden en que llegan: el servidor ya los ordena del cierre más reciente al más antiguo, así que
// cada mes queda junto. Un lote sin fecha de cierre cae en el mes del anterior.
export function groupByClosingMonth(lots: readonly LotQuality[]) {
  const groups: ClosingMonth[] = [];
  for (const lot of lots) {
    const closed = closedAt(lot);
    const month = closed
      ? dateInBogota(closed).slice(0, 7)
      : (groups.at(-1)?.month ?? '');
    const last = groups.at(-1);
    if (last?.month === month) last.lots.push(lot);
    else groups.push({ month, lots: [lot] });
  }
  return groups;
}
