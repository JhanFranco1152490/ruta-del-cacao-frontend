import { formatShortDayMonth } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { LotQuality, LotQualityDetail } from './api';
import { discardReasonText } from './discard-reasons';
import { evaluatedByLine, type Fact } from './quality-card-facts';
import { fromTenths, sumTenths, toTenths } from './tenths';

const percent = (value: string | number) => `${formatFixedDecimal(value, 1)} %`;

// «50,0 kg · 80,0 %»: los kilos de un calibre y lo que son del peso seco.
function gradeValue(kilos: string, dryWeightKg: string | null) {
  const text = `${formatFixedDecimal(kilos, 1)} kg`;
  const dry = dryWeightKg ? toTenths(dryWeightKg) : null;
  const part = toTenths(kilos);
  if (!dry || part === null) return text;
  return `${text} · ${percent((part / dry) * 100)}`;
}

export type QualitySectionView = {
  evaluation: Fact[];
  // Quién evaluó o corrigió, y las observaciones: solo con el detalle completo.
  evaluatedBy: string | null;
  notes: string | null;
  classification: Fact[];
  classifiedBy: string | null;
  discardReason: string | null;
  discardedNotice: string | null;
};

// Lo que muestra la sección Calidad de la ficha de un lote. `summary` es lo que trae el lote para
// cualquiera que lo vea; `full` es el detalle de Calidad, solo para quien puede evaluar, con los
// nombres, las observaciones y el detalle de «Otro».
export function qualitySectionView(
  summary: LotQualityDetail,
  full: LotQuality | undefined,
  dryWeightKg: string | null,
): QualitySectionView {
  const evaluation = [
    ['Bien fermentados', summary.well_fermented_pct],
    ['Con moho', summary.moldy_pct],
    ['Otros defectos', summary.other_defects_pct],
  ].map(([label, value]) => ({ label, value: percent(value) }));
  const total = sumTenths([
    summary.well_fermented_pct,
    summary.moldy_pct,
    summary.other_defects_pct,
  ]);
  evaluation.push({ label: 'Suma', value: percent(fromTenths(total)) });

  const classification =
    summary.g1_kg !== null &&
    summary.g2_kg !== null &&
    summary.discard_kg !== null
      ? [
          { label: 'G1', value: gradeValue(summary.g1_kg, dryWeightKg) },
          { label: 'G2', value: gradeValue(summary.g2_kg, dryWeightKg) },
          {
            label: 'Descarte',
            value: gradeValue(summary.discard_kg, dryWeightKg),
          },
        ]
      : [];

  const detail =
    full?.discard?.detail ?? full?.classification?.discard_detail ?? '';
  const reason = summary.discard_reason
    ? discardReasonText(summary.discard_reason, detail)
    : null;
  const classified = full?.classification;
  const discardedBy = full?.discard?.discarded_by.full_name;

  return {
    evaluation,
    evaluatedBy: full ? evaluatedByLine(full) : null,
    notes: full?.evaluation?.notes.trim() || null,
    classification,
    classifiedBy: classified
      ? `Clasificado por ${classified.classified_by.full_name} el ${formatShortDayMonth(classified.classified_at)}`
      : null,
    discardReason: summary.discarded_at ? null : reason,
    discardedNotice: summary.discarded_at
      ? `Lote descartado el ${formatShortDayMonth(summary.discarded_at)}${discardedBy ? ` por ${discardedBy}` : ''}. Motivo: ${reason ?? 'sin motivo'}.`
      : null,
  };
}
