import { z } from 'zod';

import {
  DISCARD_REASON_LABELS,
  type DiscardReason,
} from '@/lib/discard-reasons';

const DISCARD_REASONS = [
  'mold',
  'under_fermented',
  'over_fermented',
  'insect_damage',
  'contamination',
  'other',
] as const satisfies readonly DiscardReason[];

// El motivo elegido en un select, o vacío mientras no se elige.
export const discardReasonField = z.union([
  z.literal(''),
  z.enum(DISCARD_REASONS),
]);

// Las opciones del select de motivo, en el orden de la lista.
export const DISCARD_REASON_OPTIONS = (
  Object.entries(DISCARD_REASON_LABELS) as [DiscardReason, string][]
).map(([value, label]) => ({ value, label }));

export const REASON_REQUIRED_MESSAGE = 'Indique el motivo del descarte';
export const DETAIL_REQUIRED_MESSAGE = 'Describa el motivo del descarte';
export const DETAIL_MAX_LENGTH = 300;

export const needsDetail = (reason: string) => reason === 'other';

// Con Otro el detalle es obligatorio; con los demás es una observación opcional. Lo usan el
// descarte parcial de la clasificación y el descarte del lote completo.
export function discardReasonIssue(
  reason: string,
  detail: string,
): { field: 'reason' | 'detail'; message: string } | null {
  if (!reason) return { field: 'reason', message: REASON_REQUIRED_MESSAGE };
  if (needsDetail(reason) && !detail.trim()) {
    return { field: 'detail', message: DETAIL_REQUIRED_MESSAGE };
  }
  return null;
}
