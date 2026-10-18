import {
  type ControlMethod,
  controlMethodLabel,
  SAMPLING_UNITS,
  type SamplingUnit,
} from './monitoring-rules';
import type { PestDisease } from './pest-api';

// Lo que el catálogo propone para una plaga o enfermedad: qué se cuenta para medirla y qué control
// se suele aplicar. Son ayudas que la planilla preselecciona; quien registra elige lo que quiera.
export type Recommendation = {
  pestName: string;
  unit: SamplingUnit | null;
  method: ControlMethod | null;
};

type Suggesting = Pick<
  PestDisease,
  'id' | 'name' | 'suggested_sampling_unit' | 'suggested_control_method'
>;

// "Otro" no se recomienda: exige escribir qué se hizo, y una sugerencia no puede escribirlo.
export function recommendationFor(
  pests: readonly Suggesting[] | undefined,
  pestId: string | null | undefined,
): Recommendation | null {
  const pest = pests?.find(({ id }) => id === pestId);
  if (!pest) return null;
  const method = pest.suggested_control_method;
  return {
    pestName: pest.name,
    unit: pest.suggested_sampling_unit,
    method: method && method !== 'other' ? method : null,
  };
}

// La unidad de la primera detección que sugiere una: el monitoreo tiene una sola.
export function unitRecommendation(
  recommendations: readonly (Recommendation | null)[],
): SamplingUnit | null {
  return recommendations.find((rec) => rec?.unit)?.unit ?? null;
}

const joinNames = (names: readonly string[]) =>
  names.length > 1
    ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`
    : (names[0] ?? '');

// Debajo de la unidad: de dónde salió la elección, o qué plagas suelen medirse con la otra.
export function unitHint(
  recommendations: readonly (Recommendation | null)[],
  unit: SamplingUnit,
): string | undefined {
  const suggesting = recommendations.filter(
    (rec): rec is Recommendation & { unit: SamplingUnit } => !!rec?.unit,
  );
  if (suggesting.length === 0) return undefined;
  const differing = suggesting.filter((rec) => rec.unit !== unit);
  if (differing.length === 0) {
    return `Sugerido por ${joinNames(suggesting.map((rec) => rec.pestName))}: ${SAMPLING_UNITS[unit].plural}.`;
  }
  const names = differing.map((rec) => rec.pestName);
  return `${joinNames(names)} ${names.length > 1 ? 'se suelen' : 'se suele'} evaluar en ${SAMPLING_UNITS[differing[0].unit].plural}.`;
}

// Debajo del control: si lo elegido es lo recomendado, o cuál es la recomendación.
export function methodHint(
  recommendation: Recommendation | null,
  chosen: string,
): string | undefined {
  if (!recommendation?.method) return undefined;
  return chosen === recommendation.method
    ? `Recomendado para ${recommendation.pestName}.`
    : `Para ${recommendation.pestName} se recomienda ${controlMethodLabel(recommendation.method)}.`;
}
