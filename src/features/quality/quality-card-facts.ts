import { formatShortDayMonth } from '@/lib/format/dates';
import { discardReasonText } from '@/lib/discard-reasons';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { LotQuality, QualityClassification } from './api';
import { toTenths } from './tenths';

const kilos = (value: string) => `${formatFixedDecimal(value, 1)} kg`;
const percent = (value: string) => `${formatFixedDecimal(value, 1)} %`;

// «62,5 kg secos · 7,0 % de humedad · secado el 29 oct.»: lo que se mira antes de evaluar.
export const dryLine = (lot: LotQuality) =>
  `${kilos(lot.dry_weight_kg)} secos · ${percent(lot.final_moisture_pct)} de humedad · secado el ${formatShortDayMonth(lot.drying_ended_at)}`;

// «62,5 kg secos · humedad final 7,0 %»: la referencia en los formularios de calidad.
export const lotBrief = (lot: LotQuality) =>
  `${kilos(lot.dry_weight_kg)} secos · humedad final ${percent(lot.final_moisture_pct)}`;

export type Fact = { label: string; value: string };

export type BarTone = 'ok' | 'info' | 'warn' | 'err';

// Los tres porcentajes de la evaluación, cada uno con su nombre.
export const evaluationFacts = (lot: LotQuality): Fact[] =>
  lot.evaluation
    ? [
        {
          label: 'Bien fermentados',
          value: percent(lot.evaluation.well_fermented_pct),
        },
        { label: 'Con moho', value: percent(lot.evaluation.moldy_pct) },
        {
          label: 'Otros defectos',
          value: percent(lot.evaluation.other_defects_pct),
        },
      ]
    : [];

// «Evaluado por Ana el 30 oct», y si se corrigió, también «Corregido por Luis el 31 oct»: quien
// evaluó no se pierde por una corrección.
export function evaluatedByLine(lot: LotQuality) {
  const evaluation = lot.evaluation;
  if (!evaluation) return null;
  const evaluated = `Evaluado por ${evaluation.evaluated_by.full_name} el ${formatShortDayMonth(evaluation.evaluated_at)}`;
  if (evaluation.corrected_by && evaluation.corrected_at) {
    return `${evaluated} · Corregido por ${evaluation.corrected_by.full_name} el ${formatShortDayMonth(evaluation.corrected_at)}`;
  }
  return evaluated;
}

// G1, G2 y descarte en kilos.
export const classificationFacts = (
  classification: QualityClassification,
): Fact[] => [
  { label: 'G1', value: kilos(classification.g1_kg) },
  { label: 'G2', value: kilos(classification.g2_kg) },
  { label: 'Descarte', value: kilos(classification.discard_kg) },
];

// El motivo de lo descartado: del lote completo o de los kilos de descarte de la clasificación.
export function discardLine(lot: LotQuality) {
  if (lot.discard) {
    return `Motivo: ${discardReasonText(lot.discard.reason, lot.discard.detail)}`;
  }
  const reason = lot.classification?.discard_reason;
  if (!reason) return null;
  return `Motivo del descarte: ${discardReasonText(reason, lot.classification?.discard_detail)}`;
}

// Cuándo se cerró el lote y quién lo hizo: «Clasificado por Ana el 30 oct» o «Descartado por…».
export function closedByLine(lot: LotQuality) {
  if (lot.classification) {
    const { classified_by, classified_at } = lot.classification;
    return `Clasificado por ${classified_by.full_name} el ${formatShortDayMonth(classified_at)}`;
  }
  if (lot.discard) {
    const { discarded_by, discarded_at } = lot.discard;
    return `Descartado por ${discarded_by.full_name} el ${formatShortDayMonth(discarded_at)}`;
  }
  return null;
}

// G1, G2 y descarte como partes del peso seco, para dibujarlas en una sola barra. Sin kilos
// repartidos no hay nada que dibujar.
export function gradeShares(
  classification: QualityClassification,
): { label: string; width: number; tone: BarTone }[] {
  const parts = [
    { label: 'G1', tenths: toTenths(classification.g1_kg) ?? 0, tone: 'ok' },
    { label: 'G2', tenths: toTenths(classification.g2_kg) ?? 0, tone: 'info' },
    {
      label: 'Descarte',
      tenths: toTenths(classification.discard_kg) ?? 0,
      tone: 'err',
    },
  ] as const;
  const total = parts.reduce((sum, { tenths }) => sum + tenths, 0);
  if (total === 0) return [];
  return parts.map(({ label, tenths, tone }) => ({
    label,
    width: (tenths / total) * 100,
    tone,
  }));
}
