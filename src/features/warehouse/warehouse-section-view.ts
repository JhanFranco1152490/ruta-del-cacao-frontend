import {
  daysBetween,
  formatDayMonth,
  formatShortDayMonth,
} from '@/lib/format/dates';
import { toTenths } from '@/lib/format/tenths';

import type { Grade, LotStock, LotWarehouseDetail } from './api';
import { GRADE_LABELS, kilosText } from './exit-quantity';
import {
  type LedgerCell,
  type LedgerRow,
  placeText,
  warehouseLedger,
} from './warehouse-ledger';

export type BalanceCard = {
  grade: Grade;
  // «98,0 kg».
  kilos: string;
  // «G1 disponible de 100,0».
  caption: string;
  depleted: boolean;
};

export type WarehouseLedgerView = {
  rows: LedgerRow[];
  // Lo que queda de cada calibre al final del libro.
  balance: { g1: LedgerCell; g2: LedgerCell };
};

export type WarehouseSectionView = {
  // «Bodega principal · Estante 2»: dónde está el cacao hoy.
  place: string;
  // «Desde el 8 de noviembre · 3 días en bodega».
  since: string;
  balances: BalanceCard[];
  correctedBy: string | null;
  // El libro de movimientos: solo con el detalle completo.
  ledger: WarehouseLedgerView | null;
};

const GRADES = ['g1', 'g2'] as const;

// Lo que queda de cada calibre que entró con kilos; uno que entró en 0 no se muestra.
function balanceCards(summary: LotWarehouseDetail): BalanceCard[] {
  const amounts = {
    g1: [summary.g1_available_kg, summary.g1_entered_kg],
    g2: [summary.g2_available_kg, summary.g2_entered_kg],
  } as const;
  return GRADES.filter((grade) => (toTenths(amounts[grade][1]) ?? 0) > 0).map(
    (grade) => {
      const [available, entered] = amounts[grade];
      return {
        grade,
        kilos: `${kilosText(available)} kg`,
        caption: `${GRADE_LABELS[grade]} disponible de ${kilosText(entered)}`,
        depleted: (toTenths(available) ?? 0) === 0,
      };
    },
  );
}

function sinceText(entryDate: string, today: string) {
  const since = `Desde el ${formatDayMonth(entryDate)}`;
  const days = daysBetween(entryDate, today);
  if (days <= 0) return since;
  return `${since} · ${days} ${days === 1 ? 'día' : 'días'} en bodega`;
}

const balanceCell = (summary: LotWarehouseDetail, grade: Grade): LedgerCell => {
  const [available, entered] =
    grade === 'g1'
      ? [summary.g1_available_kg, summary.g1_entered_kg]
      : [summary.g2_available_kg, summary.g2_entered_kg];
  return (toTenths(entered) ?? 0) > 0
    ? { text: kilosText(available), tone: 'none' }
    : { text: '—', tone: 'none' };
};

// Lo que muestra la sección Bodega de un lote En bodega. `summary` es lo que trae el lote para
// cualquiera que lo vea; `full` es el detalle de Bodega, solo para quien consulta existencias, con
// los nombres y el libro de movimientos. `today` es el día de hoy (yyyy-MM-dd) en Bogotá.
export function warehouseSectionView(
  summary: LotWarehouseDetail,
  full: LotStock | undefined,
  today: string,
): WarehouseSectionView {
  const entry = full?.entry;
  return {
    place: placeText(summary.warehouse_name, summary.location),
    since: sinceText(summary.entry_date, today),
    balances: balanceCards(summary),
    correctedBy:
      entry?.corrected_by && entry.corrected_at
        ? `Corregido por ${entry.corrected_by.full_name} el ${formatShortDayMonth(entry.corrected_at)}`
        : null,
    ledger: full
      ? {
          rows: warehouseLedger(full),
          balance: {
            g1: balanceCell(summary, 'g1'),
            g2: balanceCell(summary, 'g2'),
          },
        }
      : null,
  };
}
