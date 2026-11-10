import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { MAX_PRICE_PER_KG } from './sale-limits';

export const PRICE_NOT_WHOLE_MESSAGE =
  'Escribe el precio en pesos, sin decimales.';
export const PRICE_OUT_OF_RANGE_MESSAGE = 'Revisa el precio por kilo.';

// «18.500» es como se escribe un precio en Colombia: el punto separa los miles. Una coma, o un punto
// que no va cada tres cifras («18.5»), son decimales, y el precio va en pesos enteros.
const WHOLE = /^\d+$/;
const WITH_THOUSANDS = /^\d{1,3}(\.\d{3})+$/;
// Con decimales, también si traen el punto de los miles antes («18.500,50»).
const WITH_DECIMALS = /^\d+(\.\d{3})*[.,]\d+$/;

// El precio escrito como número de pesos, o `null` si no es un entero.
export function parsePrice(text: string): number | null {
  const value = text.trim().replace(/\s/g, '');
  if (WHOLE.test(value)) return Number(value);
  if (WITH_THOUSANDS.test(value)) return Number(value.replace(/\./g, ''));
  return null;
}

export function priceIssue(text: string): string | null {
  if (!text.trim()) return REQUIRED_FIELD_MESSAGE;
  const price = parsePrice(text);
  if (price === null) {
    return WITH_DECIMALS.test(text.trim())
      ? PRICE_NOT_WHOLE_MESSAGE
      : PRICE_OUT_OF_RANGE_MESSAGE;
  }
  if (price < 1 || price > MAX_PRICE_PER_KG) return PRICE_OUT_OF_RANGE_MESSAGE;
  return null;
}
