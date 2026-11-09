import { toTenths } from '@/lib/format/tenths';
import type { Grade } from '@/lib/stock-quantity';

import { parsePrice } from './sale-price';

// Lo escrito en una línea, tal cual: el calibre sale de la existencia elegida.
export type LineAmounts = {
  grade: Grade | null;
  quantity_kg: string;
  price_per_kg: string;
};

// Kilos por precio, redondeado al peso con la mitad hacia arriba, como el servidor. Los kilos van en
// décimas enteras, así que el producto es exacto y la única división es la del final: 12,5 kg a
// 17.999 son 224.987,5, que se cobran 224.988. `null` mientras falte un dato o no sea válido.
export function lineSubtotal(
  quantityText: string,
  priceText: string,
): number | null {
  const tenths = toTenths(quantityText);
  const price = parsePrice(priceText);
  if (tenths === null || tenths <= 0 || price === null || price <= 0) {
    return null;
  }
  return Math.round((tenths * price) / 10);
}

// El valor total y los kilos de cada calibre de lo escrito. Una línea incompleta no suma.
export function saleTotals(lines: readonly LineAmounts[]) {
  let total = 0;
  const tenths: Record<Grade, number> = { g1: 0, g2: 0 };
  for (const line of lines) {
    const subtotal = lineSubtotal(line.quantity_kg, line.price_per_kg);
    if (subtotal === null) continue;
    total += subtotal;
    if (line.grade) tenths[line.grade] += toTenths(line.quantity_kg) ?? 0;
  }
  return { total, g1Tenths: tenths.g1, g2Tenths: tenths.g2 };
}
