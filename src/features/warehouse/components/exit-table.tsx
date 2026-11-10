'use client';

import { cn } from 'cn';

import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { StatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatAbbreviatedDate } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';

import type { StockExitRow } from '../api';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';
import { exitReasonText } from '../exit-reasons';
import { LotEyeLink } from './lot-eye-link';

// Todas las salidas de cacao, la más reciente primero. Una anulada sigue en la lista, tachada y con
// quién la anuló: las salidas no se borran. En celular cada fila es una tarjeta: el lote y los kilos
// arriba, el motivo y quién la registró debajo.
export function ExitTable({
  rows,
  lotHref,
}: {
  rows: readonly StockExitRow[];
  // La ficha del lote, solo si la cuenta puede verla.
  lotHref: ((id: string) => string) | null;
}) {
  return (
    <Table aria-label="Salidas" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Lote</TableHead>
          <TableHead>Calibre</TableHead>
          <TableHead className="text-right">Kilos</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Bodega</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const voided = row.voided !== null;
          return (
            <TableRow key={row.id}>
              <TableCell className="max-md:order-5 max-md:text-muted-foreground">
                {formatAbbreviatedDate(row.exit_date)}
              </TableCell>
              <TableCell className="whitespace-normal max-md:order-1 max-md:col-span-1!">
                <span
                  className={cn(
                    'block font-mono font-bold break-all max-md:text-base',
                    voided && 'text-muted-foreground line-through',
                  )}
                >
                  {row.lot.code}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {farmLabel(row.farm)}
                </span>
              </TableCell>
              <TableCell className="font-bold max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
                {GRADE_LABELS[row.grade]}
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-bold tabular-nums max-md:order-4 max-md:col-span-1! max-md:justify-self-end',
                  voided && 'text-muted-foreground line-through',
                )}
              >
                {kilosText(row.quantity_kg)} kg
              </TableCell>
              <TableCell className="whitespace-normal max-md:order-3 max-md:col-span-1!">
                {exitReasonText(row.reason, row.detail)}
                {row.reason !== 'other' && row.detail && (
                  <span className="block text-sm text-muted-foreground">
                    {row.detail}
                  </span>
                )}
                <span className="block text-sm text-muted-foreground">
                  {row.voided
                    ? `Anulada por ${row.voided.voided_by.full_name}: ${row.voided.reason}`
                    : `Registrada por ${row.created_by.full_name}`}
                </span>
                {voided && <StatusBadge tone="warn">Anulada</StatusBadge>}
              </TableCell>
              <TableCell className="whitespace-normal max-md:hidden">
                {row.warehouse.name}
              </TableCell>
              <TableCell className="max-md:order-6 max-md:mt-2">
                {lotHref && (
                  <div className="flex justify-end max-md:justify-start">
                    <LotEyeLink
                      code={row.lot.code}
                      href={lotHref(row.lot.id)}
                    />
                  </div>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
