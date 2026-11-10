import { formatShortDate, formatShortDayMonth } from '@/lib/format/dates';

import type { Grade, LotStock, StockExit, StockMove } from './api';
import { NO_LOCATION_TEXT } from './entry-form';
import { kilosText } from './exit-quantity';
import { exitReasonText } from './exit-reasons';

export type LedgerCell = { text: string; tone: 'in' | 'out' | 'none' };

export type LedgerRow = {
  key: string;
  kind: 'entry' | 'move' | 'exit';
  // «8 nov».
  date: string;
  // «Ingreso», «Movido» o el motivo de la salida.
  title: string;
  // «Ana Pérez · Estante 1»: quién lo hizo y, según el caso, dónde.
  detail: string;
  // «Anulada por Ana el 1 nov: se escribió 50 en vez de 5», o `null` si sigue vigente.
  voided: string | null;
  g1: LedgerCell;
  g2: LedgerCell;
  // Solo en una salida: de ella se pide anular.
  exit: StockExit | null;
};

const NONE: LedgerCell = { text: '—', tone: 'none' };
const MINUS = '−';

export const placeText = (warehouse: string, location: string) =>
  [warehouse, location || NO_LOCATION_TEXT].join(' · ');

// Dentro de la misma bodega basta la ubicación; si cambia de bodega, se dicen las dos.
function moveRoute(move: StockMove) {
  if (move.from_warehouse.id === move.to_warehouse.id) {
    return `${move.from_location || NO_LOCATION_TEXT} → ${move.to_location || NO_LOCATION_TEXT}`;
  }
  return `${placeText(move.from_warehouse.name, move.from_location)} → ${placeText(move.to_warehouse.name, move.to_location)}`;
}

const earliestMove = (moves: readonly StockMove[]) =>
  moves.reduce<StockMove | null>(
    (first, move) =>
      first && Date.parse(first.moved_at) <= Date.parse(move.moved_at)
        ? first
        : move,
    null,
  );

type Dated = { at: number; row: LedgerRow };

const exitCell = (exit: StockExit, grade: Grade): LedgerCell =>
  exit.grade === grade
    ? { text: `${MINUS}${kilosText(exit.quantity_kg)}`, tone: 'out' }
    : NONE;

const entryCell = (kilos: string): LedgerCell =>
  Number(kilos) > 0 ? { text: `+${kilosText(kilos)}`, tone: 'in' } : NONE;

function exitRow(exit: StockExit): Dated {
  return {
    at: Date.parse(exit.created_at),
    row: {
      key: `exit-${exit.id}`,
      kind: 'exit',
      date: formatShortDate(exit.exit_date),
      title: exitReasonText(exit.reason, exit.detail),
      detail: exit.created_by.full_name,
      voided: exit.voided
        ? `Anulada por ${exit.voided.voided_by.full_name} el ${formatShortDayMonth(exit.voided.voided_at)}: ${exit.voided.reason}`
        : null,
      g1: exitCell(exit, 'g1'),
      g2: exitCell(exit, 'g2'),
      exit,
    },
  };
}

function moveRow(move: StockMove): Dated {
  return {
    at: Date.parse(move.moved_at),
    row: {
      key: `move-${move.id}`,
      kind: 'move',
      date: formatShortDayMonth(move.moved_at),
      title: 'Movido',
      detail: `${moveRoute(move)} · ${move.moved_by.full_name}`,
      voided: null,
      g1: NONE,
      g2: NONE,
      exit: null,
    },
  };
}

function entryRow(full: LotStock): Dated | null {
  const { entry } = full;
  if (!entry) return null;
  const first = earliestMove(full.moves);
  const origin = first
    ? first.from_location || NO_LOCATION_TEXT
    : entry.location || NO_LOCATION_TEXT;
  return {
    at: Date.parse(entry.entered_at),
    row: {
      key: 'entry',
      kind: 'entry',
      date: formatShortDate(entry.entry_date),
      title: 'Ingreso',
      detail: `${entry.entered_by.full_name} · ${origin}`,
      voided: null,
      g1: entryCell(entry.g1_kg),
      g2: entryCell(entry.g2_kg),
      exit: null,
    },
  };
}

// El libro del lote en bodega, del ingreso a lo último: cada ingreso, cambio de lugar y salida con lo
// que movió en cada calibre. Una salida anulada sigue en él, tachada y con quién la anuló y por qué:
// las salidas no se borran. El orden es el del momento en que se registró cada cosa.
export function warehouseLedger(full: LotStock): LedgerRow[] {
  const dated = [
    entryRow(full),
    ...full.moves.map(moveRow),
    ...full.exits.map(exitRow),
  ].filter((item): item is Dated => item !== null);
  return dated.sort((a, b) => a.at - b.at).map(({ row }) => row);
}
