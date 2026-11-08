import { DISCARD_REASON_LABELS } from '@/lib/discard-reasons';
import { formatFixedDecimal } from '@/lib/format/decimal';
import type { LotStatus } from '@/lib/lot-status';

import type { LotQualityDetail } from './api';

const kilos = (value: string) => `${formatFixedDecimal(value, 1)} kg`;

// La línea de la etapa en la lista: lo pendiente, o el resultado de cada etapa de la calidad.
export function qualitySummary(
  status: LotStatus,
  quality: LotQualityDetail | null,
) {
  if (!quality) return 'Pendiente de evaluación';
  if (status === 'discarded') {
    return quality.discard_reason
      ? `Descartado · ${DISCARD_REASON_LABELS[quality.discard_reason]}`
      : 'Descartado';
  }
  if (status === 'classified') {
    const parts = ['Clasificado'];
    if (quality.g1_kg) parts.push(`G1 ${kilos(quality.g1_kg)}`);
    if (quality.g2_kg) parts.push(`G2 ${kilos(quality.g2_kg)}`);
    if (quality.discard_kg && Number(quality.discard_kg) > 0) {
      parts.push(`descarte ${kilos(quality.discard_kg)}`);
    }
    return parts.join(' · ');
  }
  return `Evaluado · ${formatFixedDecimal(quality.well_fermented_pct, 1)} % bien fermentados`;
}
