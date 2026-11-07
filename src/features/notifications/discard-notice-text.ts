import type { components } from '@/lib/api/schema';
import { discardReasonText } from '@/lib/discard-reasons';
import { lotDetailPath } from '@/lib/paths/lots';

import type { NotificationView } from './notice-parts';

type Lot = components['schemas']['LotBrief'];

// «Lote 000123-F02-P05-261014-1 descartado: Moho.» Es algo que ya pasó: no se atenúa ni pide
// acción, y lleva a la ficha del lote. El detalle de «Otro» no viaja con el aviso; se lee en la
// ficha.
export function describeDiscardNotice(lot: Lot): NotificationView {
  const reason = lot.quality?.discard_reason;
  return {
    look: 'discarded',
    title: 'Lote descartado',
    subject: reason
      ? `Lote ${lot.code} descartado: ${discardReasonText(reason)}.`
      : `Lote ${lot.code} descartado.`,
    detail: lot.farm.name,
    stale: false,
    href: lotDetailPath(lot.id),
    origin: 'Calidad',
  };
}
