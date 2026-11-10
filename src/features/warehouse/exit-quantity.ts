import { formatFixedDecimal } from '@/lib/format/decimal';
import { fromTenths, toTenths } from '@/lib/format/tenths';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { ONE_DECIMAL_MESSAGE } from '@/lib/validation/percent';

import type { Grade, StockBalance } from './api';

export const GRADE_LABELS: Record<Grade, string> = { g1: 'G1', g2: 'G2' };

export const INVALID_QUANTITY_MESSAGE = 'Escribe una cantidad válida';
export const QUANTITY_NOT_POSITIVE_MESSAGE = 'La cantidad debe ser mayor que 0';

// Los kilos como se leen en bodega: siempre con un decimal («250,0»).
export const kilosText = (kilos: string | number) =>
  formatFixedDecimal(kilos, 1);

// «La cantidad supera lo disponible (250,0 kg)»: el mismo texto que el servidor.
export const exceedsAvailableMessage = (availableKg: string | number) =>
  `La cantidad supera lo disponible (${kilosText(availableKg)} kg)`;

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

// «Disponible: 250,0 kg», al lado de cada calibre.
export const availableText = (availableTenths: number) =>
  `Disponible: ${kilosText(fromTenths(availableTenths))} kg`;

// La cantidad de una salida: obligatoria, mayor que 0, con un decimal y sin pasar de lo que hay. Se
// compara en décimas para que 250,0 contra 250,0 no falle por redondeo.
export function exitQuantityIssue(
  text: string,
  availableTenths: number,
): string | null {
  const value = text.trim().replace(',', '.');
  if (!value) return REQUIRED_FIELD_MESSAGE;
  const tenths = toTenths(value);
  if (tenths === null) return INVALID_QUANTITY_MESSAGE;
  if (!/^-?\d+(\.\d)?$/.test(value)) return ONE_DECIMAL_MESSAGE;
  if (tenths <= 0) return QUANTITY_NOT_POSITIVE_MESSAGE;
  if (tenths > availableTenths) {
    return exceedsAvailableMessage(fromTenths(availableTenths));
  }
  return null;
}
