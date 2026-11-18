import type { Report, ReportColumn } from './api';
import { formatCell, isNumericKind } from './report-cells';

export type ReportCellLine = { key: string; label?: string; text: string };

// Las líneas de una celda que junta varias columnas (la etapa de Secado: fecha, kg seco y
// rendimiento). Un texto o una fecha se leen solos; una cifra no («40,5 kg» de qué), así que lleva la
// etiqueta de su columna. Lo que no ha ocurrido no ocupa una línea; si no hay nada, una raya.
export function cellLines(
  columns: readonly ReportColumn[],
  row: Report['rows'][number],
): ReportCellLine[] {
  const lines = columns
    .filter(({ key }) => row[key] !== null && row[key] !== '')
    .map(({ key, label, kind }) => ({
      key,
      label: isNumericKind(kind) ? label : undefined,
      text: formatCell(row[key], kind, { withUnit: true }),
    }));
  return lines.length > 0 ? lines : [{ key: 'empty', text: '—' }];
}
