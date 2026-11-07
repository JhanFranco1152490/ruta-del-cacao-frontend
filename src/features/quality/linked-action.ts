import type { QualityAction } from '@/lib/paths/quality';

import type { LotQuality } from './api';
import { qualityActions, type QualityPermissions } from './quality-actions';
import { statusChangedMessage } from './quality-errors';

export const LOT_UNAVAILABLE_MESSAGE =
  'Este lote ya no está disponible en Calidad.';

// Qué hacer al llegar con `?lote=&accion=` desde Lotes o la ficha: abrir el formulario si la acción
// todavía aplica al lote, o decir por qué no (otra persona ya lo evaluó, clasificó o descartó, o la
// cuenta no tiene ese permiso).
export function linkedActionOutcome(
  lot: LotQuality,
  action: QualityAction,
  can: QualityPermissions,
): { open: true } | { open: false; message: string } {
  const offered = qualityActions({ status: lot.lot.status, online: true, can });
  if (offered.some((offer) => offer.action === action)) return { open: true };
  const stillApplies = qualityActions({
    status: lot.lot.status,
    online: true,
    can: { evaluate: true, classify: true, discard: true },
  }).some((offer) => offer.action === action);
  return {
    open: false,
    message: stillApplies
      ? 'Tu cuenta no tiene permiso para hacer esto.'
      : statusChangedMessage(action, lot.lot.status),
  };
}
