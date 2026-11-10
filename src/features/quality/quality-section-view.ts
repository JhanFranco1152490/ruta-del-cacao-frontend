import { formatShortDayMonth } from '@/lib/format/dates';
import { discardReasonText } from '@/lib/discard-reasons';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { LotQuality, LotQualityDetail } from './api';

import { type BarTone, evaluatedByLine, type Fact } from './quality-card-facts';
import { fromTenths, sumTenths, toTenths } from '@/lib/format/tenths';

const percent = (value: string | number) => `${formatFixedDecimal(value, 1)} %`;

// Un dato de la sección; con `bar`, además se dibuja como parte de un total de 100.
export type SectionFact = Fact & { bar?: { width: number; tone: BarTone } };

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

// «50,0 kg · 80,0 %»: los kilos de un calibre y lo que son del peso seco.
function gradeFact(
  label: string,
  kilos: string,
  dryWeightKg: string | null,
  tone: BarTone,
): SectionFact {
  const text = `${formatFixedDecimal(kilos, 1)} kg`;
  const dry = dryWeightKg ? toTenths(dryWeightKg) : null;
  const part = toTenths(kilos);
  if (!dry || part === null) return { label, value: text };
  const share = (part / dry) * 100;
  return {
    label,
    value: `${text} · ${percent(share)}`,
    bar: { width: clampPercent(share), tone },
  };
}

export type QualitySectionView = {
  evaluation: SectionFact[];
  // Quién evaluó o corrigió, y las observaciones: solo con el detalle completo.
  evaluatedBy: string | null;
  notes: string | null;
  classification: SectionFact[];
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
  const evaluation: SectionFact[] = [
    ['Bien fermentados', summary.well_fermented_pct, 'ok'],
    ['Con moho', summary.moldy_pct, 'err'],
    ['Otros defectos', summary.other_defects_pct, 'warn'],
  ].map(([label, value, tone]) => ({
    label,
    value: percent(value),
    bar: { width: clampPercent(Number(value)), tone: tone as BarTone },
  }));
  const total = sumTenths([
    summary.well_fermented_pct,
    summary.moldy_pct,
    summary.other_defects_pct,
  ]);
  evaluation.push({ label: 'Suma', value: percent(fromTenths(total)) });

  const classification: SectionFact[] =
    summary.g1_kg !== null &&
    summary.g2_kg !== null &&
    summary.discard_kg !== null
      ? [
          gradeFact('G1', summary.g1_kg, dryWeightKg, 'ok'),
          gradeFact('G2', summary.g2_kg, dryWeightKg, 'info'),
          gradeFact('Descarte', summary.discard_kg, dryWeightKg, 'err'),
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
