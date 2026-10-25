import { formatFixedDecimal } from '@/lib/format/decimal';

export type ReferenceRange = { min: string; max: string };

// El rango que el productor configuró como referencia, o lo que se midió respecto de él: no impide
// registrar el volteo, solo avisa que esa lectura se sale de lo esperado.
function referenceText(
  typed: string,
  range: ReferenceRange,
  decimals: number,
  unit: string,
) {
  const bounds = `${formatFixedDecimal(range.min, decimals)}–${formatFixedDecimal(range.max, decimals)}${unit}`;
  const value = Number(typed.replace(',', '.'));
  const measured = typed.trim() !== '' && !Number.isNaN(value);
  const outside =
    measured && (value < Number(range.min) || value > Number(range.max));
  return outside
    ? `Fuera de la referencia (${bounds}).`
    : `Referencia: ${bounds}.`;
}

export const temperatureHint = (typed: string, range: ReferenceRange) =>
  referenceText(typed, range, 1, ' °C');

export const phHint = (typed: string, range: ReferenceRange) =>
  referenceText(typed, range, 2, '');
