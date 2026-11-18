import type { ReportColumn } from './api';

// Las columnas que se leen juntas, por su clave, en el orden en que se buscan. Un reporte ancho
// (la trazabilidad trae 20) no cabe a 1280 px: así cada etapa ocupa una celda de varias líneas. No
// dependen del tipo de reporte: un grupo se forma en cualquiera que traiga todas sus claves, y
// cada columna entra en un solo grupo (las de la trazabilidad se buscan primero porque comparten
// claves con las demás).
const GROUPS: readonly { key: string; label: string; keys: string[] }[] = [
  { key: 'lot', label: 'Lote', keys: ['lot_code', 'status'] },
  { key: 'lot', label: 'Lote', keys: ['lot_code', 'lot_status'] },
  { key: 'origin', label: 'Origen', keys: ['farm', 'plot'] },
  { key: 'harvest', label: 'Cosecha', keys: ['harvest_date', 'green_kg'] },
  {
    key: 'fermentation',
    label: 'Fermentación',
    keys: ['fermentation_started_on', 'fermentation_ended_on'],
  },
  {
    key: 'drying',
    label: 'Secado',
    keys: ['drying_ended_on', 'dry_kg', 'yield_pct'],
  },
  {
    key: 'quality',
    label: 'Calidad',
    keys: [
      'quality_result',
      'quality_closed_on',
      'g1_kg',
      'g2_kg',
      'discard_kg',
    ],
  },
  { key: 'warehouse', label: 'Bodega', keys: ['entry_date', 'available_kg'] },
  { key: 'sale', label: 'Venta', keys: ['sold_kg', 'buyers'] },
  { key: 'g1', label: 'G1', keys: ['g1_kg', 'g1_pct'] },
  { key: 'g2', label: 'G2', keys: ['g2_kg', 'g2_pct'] },
  { key: 'discard', label: 'Descarte', keys: ['discard_kg', 'discard_pct'] },
];

export type ReportTableColumn =
  | { type: 'single'; key: string; column: ReportColumn }
  | { type: 'group'; key: string; label: string; columns: ReportColumn[] };

// Las columnas de la tabla de escritorio: cada grupo queda donde venía su primera columna, con las
// suyas en el orden del grupo, y las que no entran en ninguno quedan como llegaron.
export function groupColumns(
  columns: readonly ReportColumn[],
): ReportTableColumn[] {
  const byKey = new Map(columns.map((column) => [column.key, column]));
  const groupOf = new Map<string, ReportTableColumn & { type: 'group' }>();
  for (const group of GROUPS) {
    const members = group.keys.map((key) => byKey.get(key));
    if (members.some((column) => !column || groupOf.has(column.key))) {
      continue;
    }
    const grouped = {
      type: 'group' as const,
      key: group.key,
      label: group.label,
      columns: members as ReportColumn[],
    };
    for (const key of group.keys) groupOf.set(key, grouped);
  }

  const placed = new Set<ReportTableColumn>();
  const table: ReportTableColumn[] = [];
  for (const column of columns) {
    const grouped = groupOf.get(column.key);
    if (!grouped) {
      table.push({ type: 'single', key: column.key, column });
    } else if (!placed.has(grouped)) {
      placed.add(grouped);
      table.push(grouped);
    }
  }
  return table;
}
