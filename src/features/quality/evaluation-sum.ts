import { formatFixedDecimal } from '@/lib/format/decimal';
import { MAX_PERCENT } from '@/lib/validation/percent';

import { fromTenths, sumTenths } from './tenths';

export const SUM_EXCEEDS_MESSAGE = 'La suma no puede pasar de 100 %';

export type PercentValues = {
  well_fermented_pct: string;
  moldy_pct: string;
  other_defects_pct: string;
};

const percent = (tenths: number) =>
  `${formatFixedDecimal(fromTenths(tenths), 1)} %`;

// La suma de los tres porcentajes mientras se escriben. Lo que falta para 100 son granos que no caen
// en ninguna de las tres categorías (violetas, pizarrosos).
export function evaluationSum(values: PercentValues) {
  const total = sumTenths([
    values.well_fermented_pct,
    values.moldy_pct,
    values.other_defects_pct,
  ]);
  const limit = MAX_PERCENT * 10;
  const exceeds = total > limit;
  return {
    exceeds,
    line: exceeds
      ? SUM_EXCEEDS_MESSAGE
      : `Suma: ${percent(total)} · ${percent(limit - total)} en otras categorías`,
  };
}
