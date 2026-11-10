import { toTenths } from '@/lib/format/tenths';
import { GRADE_LABELS } from '@/lib/stock-quantity';

import type { Grade, StockBalance } from './api';

export type ExitableGrade = {
  grade: Grade;
  label: string;
  availableTenths: number;
};

// Los calibres de los que puede salir cacao: los que tienen existencias, en el orden G1, G2.
export function exitableGrades(
  balances: readonly StockBalance[],
): ExitableGrade[] {
  return (['g1', 'g2'] as const).flatMap((grade) => {
    const balance = balances.find((candidate) => candidate.grade === grade);
    const availableTenths = balance ? (toTenths(balance.quantity_kg) ?? 0) : 0;
    return availableTenths > 0
      ? [{ grade, label: GRADE_LABELS[grade], availableTenths }]
      : [];
  });
}
