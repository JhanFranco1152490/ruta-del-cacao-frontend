import { normalizeCode } from './schemas';

const TRAILING_NUMBER = /^(.*?)(\d+)$/;

// El código que se propone para la parcela nueva: sigue el estilo de las que ya hay (prefijo y
// ceros: P-01, P-02 → P-03) y toma el número siguiente al mayor. Sin parcelas, o sin códigos que
// terminen en número, empieza en P1. Siempre es un código libre en la finca.
export function suggestPlotCode(existingCodes: readonly string[]): string {
  const taken = new Set(existingCodes.map(normalizeCode));
  let style: { prefix: string; digits: number; number: number } | null = null;
  for (const code of existingCodes) {
    const match = TRAILING_NUMBER.exec(code.trim());
    if (!match) continue;
    const number = Number(match[2]);
    if (!style || number > style.number) {
      // Con ceros a la izquierda ("01") se conserva el ancho; sin ellos ("7") no se rellena.
      const padded = match[2].startsWith('0') ? match[2].length : 0;
      style = { prefix: match[1], digits: padded, number };
    }
  }

  const prefix = style?.prefix ?? 'P';
  const digits = style?.digits ?? 0;
  let next = (style?.number ?? 0) + 1;
  let candidate = `${prefix}${String(next).padStart(digits, '0')}`;
  // El mayor puede haber dejado huecos o chocar con un código escrito distinto: se busca uno libre.
  while (taken.has(normalizeCode(candidate))) {
    next += 1;
    candidate = `${prefix}${String(next).padStart(digits, '0')}`;
  }
  return candidate;
}
