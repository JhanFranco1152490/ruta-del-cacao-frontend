import { formatDayMonth, formatShortDayMonth } from '@/lib/format/dates';
import { toTenths } from '@/lib/format/tenths';

import type {
  Grade,
  LotStock,
  LotWarehouseDetail,
  StockExit,
  StockMove,
} from './api';
import { NO_LOCATION_TEXT } from './entry-form';
import { GRADE_LABELS, kilosText } from './exit-quantity';
import { exitReasonText } from './exit-reasons';

export type Fact = { label: string; value: string };

export type BalanceLine = {
  grade: Grade;
  // «G1: 245,0 de 250,0 kg».
  text: string;
  depleted: boolean;
};

export type ExitLine = {
  exit: StockExit;
  // «5,0 kg de G1 · Muestra».
  title: string;
  // «31 de octubre · Registrada por Ana el 31 oct».
  detail: string;
  // «Anulada por Ana el 1 nov: se escribió 50 en vez de 5», o `null` si sigue vigente.
  voided: string | null;
};

export type MoveLine = {
  id: string;
  // «Bodega principal · Estante 1 → Anexo · Zona B».
  route: string;
  // «2 de noviembre · Movido por Ana el 2 nov».
  detail: string;
};

export type WarehouseSectionView = {
  entry: Fact[];
  balances: BalanceLine[];
  // Quién ingresó, quién corrigió y las salidas: solo con el detalle completo.
  enteredBy: string | null;
  correctedBy: string | null;
  exits: ExitLine[] | null;
  // Los cambios de lugar, el más reciente primero: solo con el detalle completo.
  moves: MoveLine[] | null;
};

export const placeText = (warehouse: string, location: string) =>
  [warehouse, location || NO_LOCATION_TEXT].join(' · ');

const moveLine = (move: StockMove): MoveLine => ({
  id: move.id,
  route: `${placeText(move.from_warehouse.name, move.from_location)} → ${placeText(move.to_warehouse.name, move.to_location)}`,
  detail: `Movido por ${move.moved_by.full_name} el ${formatShortDayMonth(move.moved_at)}`,
});

const GRADES = ['g1', 'g2'] as const;

// Lo que queda de cada calibre que entró con kilos; uno que entró en 0 no se muestra.
function balanceLines(summary: LotWarehouseDetail): BalanceLine[] {
  const amounts = {
    g1: [summary.g1_available_kg, summary.g1_entered_kg],
    g2: [summary.g2_available_kg, summary.g2_entered_kg],
  } as const;
  return GRADES.filter((grade) => (toTenths(amounts[grade][1]) ?? 0) > 0).map(
    (grade) => {
      const [available, entered] = amounts[grade];
      return {
        grade,
        text: `${GRADE_LABELS[grade]}: ${kilosText(available)} de ${kilosText(entered)} kg`,
        depleted: (toTenths(available) ?? 0) === 0,
      };
    },
  );
}

const exitLine = (exit: StockExit): ExitLine => ({
  exit,
  title: `${kilosText(exit.quantity_kg)} kg de ${GRADE_LABELS[exit.grade]} · ${exitReasonText(exit.reason, exit.detail)}`,
  detail: `${formatDayMonth(exit.exit_date)} · Registrada por ${exit.created_by.full_name} el ${formatShortDayMonth(exit.created_at)}`,
  voided: exit.voided
    ? `Anulada por ${exit.voided.voided_by.full_name} el ${formatShortDayMonth(exit.voided.voided_at)}: ${exit.voided.reason}`
    : null,
});

// Lo que muestra la sección Bodega de un lote En bodega. `summary` es lo que trae el lote para
// cualquiera que lo vea; `full` es el detalle de Bodega, solo para quien consulta existencias, con
// los nombres y las salidas.
export function warehouseSectionView(
  summary: LotWarehouseDetail,
  full: LotStock | undefined,
): WarehouseSectionView {
  const entry = full?.entry;
  return {
    entry: [
      { label: 'Fecha de ingreso', value: formatDayMonth(summary.entry_date) },
      { label: 'Bodega', value: summary.warehouse_name },
      {
        label: 'Ubicación',
        value: summary.location || NO_LOCATION_TEXT,
      },
      {
        label: 'G1 ingresado',
        value: `${kilosText(summary.g1_entered_kg)} kg`,
      },
      {
        label: 'G2 ingresado',
        value: `${kilosText(summary.g2_entered_kg)} kg`,
      },
    ],
    balances: balanceLines(summary),
    enteredBy: entry
      ? `Ingresado por ${entry.entered_by.full_name} el ${formatShortDayMonth(entry.entered_at)}`
      : null,
    correctedBy:
      entry?.corrected_by && entry.corrected_at
        ? `Corregido por ${entry.corrected_by.full_name} el ${formatShortDayMonth(entry.corrected_at)}`
        : null,
    exits: full ? full.exits.map(exitLine) : null,
    moves: full ? full.moves.map(moveLine) : null,
  };
}
