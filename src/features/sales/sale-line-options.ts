import { toTenths } from '@/lib/format/tenths';
import { availableText, GRADE_LABELS, type Grade } from '@/lib/stock-quantity';

import type { FarmStockRow } from './api';

// Lo que se puede vender en una línea: una existencia de la finca, un lote y un calibre.
export type StockOption = {
  value: string;
  label: string;
  hint: string;
  lotId: string;
  lotCode: string;
  grade: Grade;
  availableTenths: number;
  entryDate: string;
};

// La línea elige una existencia por esta clave: un lote se vende en G1 y en G2 por separado.
export const stockKey = (lotId: string, grade: Grade) => `${lotId}:${grade}`;

// Las existencias como opciones, por código de lote y con G1 antes que G2. Lo agotado no llega: el
// servidor solo lista lo que tiene kilos.
export function stockOptions(rows: readonly FarmStockRow[]): StockOption[] {
  return rows
    .map((row) => {
      const availableTenths = toTenths(row.quantity_kg) ?? 0;
      return {
        value: stockKey(row.lot.id, row.grade),
        label: `${row.lot.code} · ${GRADE_LABELS[row.grade]}`,
        hint: availableText(availableTenths),
        lotId: row.lot.id,
        lotCode: row.lot.code,
        grade: row.grade,
        availableTenths,
        entryDate: row.entry_date,
      };
    })
    .filter(({ availableTenths }) => availableTenths > 0)
    .sort(
      (a, b) =>
        a.lotCode.localeCompare(b.lotCode) || a.grade.localeCompare(b.grade),
    );
}

// Lo que ofrece la línea `index`: todo menos lo que ya eligió otra línea. La suya se queda, para que
// el campo no pierda lo elegido.
export function optionsForLine(
  options: readonly StockOption[],
  chosen: readonly string[],
  index: number,
): StockOption[] {
  const taken = new Set(chosen.filter((value, at) => value && at !== index));
  return options.filter(({ value }) => !taken.has(value));
}

export const findStockOption = (
  options: readonly StockOption[],
  value: string,
) => options.find((option) => option.value === value);
