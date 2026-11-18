import { formatFixedDecimal } from '@/lib/format/decimal';
import { formatNumericDate } from '@/lib/format/dates';
import { formatPesos } from '@/lib/format/pesos';

import type { ReportCell, ReportCellKind } from './api';

const EMPTY = '—';

const NUMERIC_KINDS: readonly ReportCellKind[] = [
  'kg',
  'pct',
  'money',
  'count',
];

const UNITS: Partial<Record<ReportCellKind, string>> = { kg: 'kg', pct: '%' };

// Los números van a la derecha, para que las cifras de una columna se lean alineadas.
export const isNumericKind = (kind: ReportCellKind) =>
  NUMERIC_KINDS.includes(kind);

// Un valor como se lee en pantalla, según el tipo de su columna. Sola en su columna no necesita la
// unidad (la dice el encabezado); dentro de una celda que junta varias, sí: `withUnit`.
export function formatCell(
  value: ReportCell,
  kind: ReportCellKind,
  { withUnit = false } = {},
): string {
  if (value === null || value === '') return EMPTY;
  switch (kind) {
    case 'date':
      return formatNumericDate(String(value));
    case 'kg':
    case 'pct': {
      const number = formatFixedDecimal(value, 1);
      return withUnit ? `${number} ${UNITS[kind]}` : number;
    }
    case 'money':
      return formatPesos(Number(value));
    case 'count':
      return formatFixedDecimal(value, 0);
    default:
      return String(value);
  }
}
