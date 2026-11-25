import { formatFixedDecimal } from '@/lib/format/decimal';
import { formatNumericDate, formatNumericDateTime } from '@/lib/format/dates';

import type { AuditValue, AuditValueKind } from './api';

const DECIMAL_TEXT = /^-?\d+(?:\.(\d+))?$/;

// Una cifra con los decimales que guardó el servidor («125,0», «1,20», «4,90»): quitarle los ceros
// haría que el anterior y el nuevo de un mismo campo parecieran de precisión distinta.
function formatNumber(value: string | number) {
  const text = String(value);
  const match = DECIMAL_TEXT.exec(text);
  if (!match) return text;
  return formatFixedDecimal(text, match[1]?.length ?? 0);
}

// El valor de un campo como se lee, según `kind`; `null` si no hay nada que escribir. Las fechas
// llevan el año porque la bitácora abarca varios.
export function formatAuditValue(
  value: AuditValue,
  kind: AuditValueKind,
): string | null {
  if (value === null || (typeof value === 'string' && !value.trim())) {
    return null;
  }
  switch (kind) {
    case 'number':
      return typeof value === 'boolean' ? String(value) : formatNumber(value);
    case 'date':
      return formatNumericDate(String(value));
    case 'datetime':
      return formatNumericDateTime(String(value));
    case 'bool':
      return value === true || value === 'true' ? 'Sí' : 'No';
    default:
      return String(value);
  }
}
