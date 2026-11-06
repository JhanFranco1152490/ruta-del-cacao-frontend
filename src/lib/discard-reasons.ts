import type { components } from '@/lib/api/schema';

export type DiscardReason = components['schemas']['QualityDiscardReasonEnum'];

// Los motivos de descarte de un lote, como se eligen en la lista. Los usan calidad, la ficha del
// lote y las notificaciones.
export const DISCARD_REASON_LABELS: Record<DiscardReason, string> = {
  mold: 'Moho',
  under_fermented: 'Fermentación insuficiente',
  over_fermented: 'Sobrefermentado',
  insect_damage: 'Daño por insectos',
  contamination: 'Contaminación (humo, olores, químicos)',
  other: 'Otro (con detalle)',
};

// El motivo como se lee en una ficha o un aviso: con Otro, lo que se escribió, si se conoce.
export function discardReasonText(reason: DiscardReason, detail = '') {
  if (reason === 'other') return detail.trim() || 'Otro';
  return DISCARD_REASON_LABELS[reason];
}
