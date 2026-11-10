import type { components } from '@/lib/api/schema';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { fromTenths, toTenths } from '@/lib/format/tenths';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { ONE_DECIMAL_MESSAGE } from '@/lib/validation/percent';

// Los kilos de cacao seco que salen de bodega, por una salida o por una venta: las mismas reglas y
// los mismos textos que el servidor.

export type Grade = components['schemas']['StockGradeEnum'];

export const GRADE_LABELS: Record<Grade, string> = { g1: 'G1', g2: 'G2' };

export const INVALID_QUANTITY_MESSAGE = 'Escribe una cantidad válida';
export const QUANTITY_NOT_POSITIVE_MESSAGE = 'La cantidad debe ser mayor que 0';

// Los kilos como se leen en bodega: siempre con un decimal («250,0»).
export const kilosText = (kilos: string | number) =>
  formatFixedDecimal(kilos, 1);

// «La cantidad supera lo disponible (250,0 kg)»: el mismo texto que el servidor.
export const exceedsAvailableMessage = (availableKg: string | number) =>
  `La cantidad supera lo disponible (${kilosText(availableKg)} kg)`;

// «Disponible: 250,0 kg», al lado de cada calibre.
export const availableText = (availableTenths: number) =>
  `Disponible: ${kilosText(fromTenths(availableTenths))} kg`;

// La cantidad que sale: obligatoria, mayor que 0, con un decimal y sin pasar de lo que hay. Se
// compara en décimas para que 250,0 contra 250,0 no falle por redondeo.
export function stockQuantityIssue(
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
