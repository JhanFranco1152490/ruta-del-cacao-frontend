import { formatShortDayMonth } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { LotQuality, QualityClassification } from './api';
import { discardReasonText } from './discard-reasons';

const kilos = (value: string) => `${formatFixedDecimal(value, 1)} kg`;
const percent = (value: string) => `${formatFixedDecimal(value, 1)} %`;

// «62,5 kg secos · 7,0 % de humedad · secado el 29 oct.»: lo que se mira antes de evaluar.
export const dryLine = (lot: LotQuality) =>
  `${kilos(lot.dry_weight_kg)} secos · ${percent(lot.final_moisture_pct)} de humedad · secado el ${formatShortDayMonth(lot.drying_ended_at)}`;

export type Fact = { label: string; value: string };

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

// «Evaluado por Ana el 30 oct.», o quién la corrigió por última vez.
export function evaluatedByLine(lot: LotQuality) {
  const evaluation = lot.evaluation;
  if (!evaluation) return null;
  if (evaluation.corrected_by && evaluation.corrected_at) {
    return `Corregido por ${evaluation.corrected_by.full_name} el ${formatShortDayMonth(evaluation.corrected_at)}`;
  }
  return `Evaluado por ${evaluation.evaluated_by.full_name} el ${formatShortDayMonth(evaluation.evaluated_at)}`;
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
