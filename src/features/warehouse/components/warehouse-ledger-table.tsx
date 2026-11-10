'use client';

import { cn } from 'cn';
import { Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { StockExit } from '../api';
import type { Offer } from '../warehouse-actions';
import type { LedgerCell, LedgerRow } from '../warehouse-ledger';
import type { WarehouseLedgerView } from '../warehouse-section-view';

const TONES: Record<LedgerCell['tone'], string> = {
  in: 'font-bold text-ok',
  out: 'font-bold text-err',
  none: 'text-muted-foreground',
};

function Amount({ cell, struck }: { cell: LedgerCell; struck: boolean }) {
  return (
    <TableCell
      className={cn(
        'text-right align-top tabular-nums',
        TONES[cell.tone],
        struck && 'font-normal text-muted-foreground line-through',
      )}
    >
      {cell.text}
    </TableCell>
  );
}

function LedgerLine({
  row,
  voidOffer,
  onVoid,
}: {
  row: LedgerRow;
  voidOffer: Offer<'anular'> | null;
  onVoid: (exit: StockExit) => void;
}) {
  const struck = row.voided !== null;
  const exit = row.exit;
  return (
    <TableRow>
      <TableCell className="align-top text-muted-foreground tabular-nums">
        {row.date}
      </TableCell>
      <TableCell className="align-top whitespace-normal">
        <p
          className={cn(
            'font-bold',
            struck && 'text-muted-foreground line-through',
          )}
        >
          {row.title}
        </p>
        <p className="text-sm text-muted-foreground">{row.detail}</p>
        {row.voided && <p className="text-sm">{row.voided}</p>}
        {exit && voidOffer && (
          <Button
            aria-label={`Anular la salida: ${row.title}`}
            className="mt-1.5"
            disabled={voidOffer.disabledReason !== null}
            onClick={() => onVoid(exit)}
            size="sm"
            title={voidOffer.disabledReason ?? undefined}
            variant="action"
          >
            <Undo2 aria-hidden="true" />
            {voidOffer.label}
          </Button>
        )}
      </TableCell>
      <Amount cell={row.g1} struck={struck} />
      <Amount cell={row.g2} struck={struck} />
    </TableRow>
  );
}

// El libro del lote: del ingreso a lo último, con lo que movió cada línea en cada calibre y el
// saldo al final. Las salidas anuladas siguen, tachadas.
export function WarehouseLedgerTable({
  ledger,
  voidOfferOf,
  onVoid,
}: {
  ledger: WarehouseLedgerView;
  voidOfferOf: (exit: StockExit) => Offer<'anular'> | null;
  onVoid: (exit: StockExit) => void;
}) {
  return (
    <Table aria-label="Movimientos del lote">
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Movimiento</TableHead>
          <TableHead className="text-right">G1</TableHead>
          <TableHead className="text-right">G2</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ledger.rows.map((row) => (
          <LedgerLine
            key={row.key}
            onVoid={onVoid}
            row={row}
            voidOffer={row.exit ? voidOfferOf(row.exit) : null}
          />
        ))}
        <TableRow>
          <TableCell className="font-bold text-selva" colSpan={2}>
            Saldo
          </TableCell>
          <TableCell className="text-right font-bold tabular-nums">
            {ledger.balance.g1.text}
          </TableCell>
          <TableCell className="text-right font-bold tabular-nums">
            {ledger.balance.g2.text}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
