'use client';

import { MoveRight, PackageMinus } from 'lucide-react';

import { ActionsMenu } from '@/components/actions-menu';
import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { SortableTableHead } from '@/components/sortable-table-head';
import { Button } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
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

import type { StockRow } from '../api';
import type { DialogRequest } from '../dialog-request';
import { NO_LOCATION_TEXT } from '../entry-form';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';
import type { Offer } from '../warehouse-actions';
import { LotEyeLink } from './lot-eye-link';

// Las existencias: una fila por lote y calibre. En celular cada fila es una tarjeta: el código y
// el calibre arriba, la finca, la bodega con su ubicación y los kilos, la fecha de ingreso, y las
// acciones al pie (sin enlace que cubra la tarjeta: la acción principal es registrar la salida).
export function StockTable({
  rows,
  ordering,
  onSort,
  exitOffer,
  moveOffer,
  lotHref,
  onAction,
}: {
  rows: readonly StockRow[];
  ordering: string;
  onSort: (ordering: string) => void;
  // Registrar una salida, si la cuenta puede; igual para todas las filas.
  exitOffer: Offer<'salida'> | null;
  // Mover el cacao de lugar, si la cuenta puede; va en el «⋯» de cada fila.
  moveOffer: Offer<'mover'> | null;
  // La ficha del lote, solo si la cuenta puede verla.
  lotHref: ((id: string) => string) | null;
  onAction: (request: DialogRequest) => void;
}) {
  const sortable = { ordering, onSort };
  return (
    <Table aria-label="Existencias" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <SortableTableHead field="lot" label="Lote" {...sortable} />
          <SortableTableHead field="grade" label="Calibre" {...sortable} />
          <SortableTableHead
            align="right"
            field="quantity"
            label="Disponible"
            {...sortable}
          />
          <SortableTableHead field="location" label="Ubicación" {...sortable} />
          <SortableTableHead field="entry_date" label="Ingreso" {...sortable} />
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.lot.id}-${row.grade}`}>
            <TableCell className="whitespace-normal max-md:order-1 max-md:col-span-1!">
              <span className="block font-mono font-bold break-all max-md:text-base">
                {row.lot.code}
              </span>
              <span className="block text-sm text-muted-foreground">
                {farmLabel(row.farm)}
              </span>
            </TableCell>
            <TableCell className="font-bold max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
              {GRADE_LABELS[row.grade]}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums max-md:order-4 max-md:col-span-1! max-md:justify-self-end">
              {kilosText(row.quantity_kg)} kg
            </TableCell>
            <TableCell className="whitespace-normal max-md:order-3 max-md:col-span-1!">
              {row.warehouse.name}
              <span className="block text-sm text-muted-foreground">
                {row.location || NO_LOCATION_TEXT}
              </span>
            </TableCell>
            <TableCell className="max-md:order-5 max-md:text-muted-foreground">
              <span className="md:hidden">Ingresó el </span>
              {formatAbbreviatedDate(row.entry_date)}
            </TableCell>
            <TableCell className="max-md:order-6 max-md:mt-2">
              <StockRowActions
                exitOffer={exitOffer}
                lotHref={lotHref}
                moveOffer={moveOffer}
                onAction={onAction}
                row={row}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StockRowActions({
  row,
  exitOffer,
  moveOffer,
  lotHref,
  onAction,
}: {
  row: StockRow;
  exitOffer: Offer<'salida'> | null;
  moveOffer: Offer<'mover'> | null;
  lotHref: ((id: string) => string) | null;
  onAction: (request: DialogRequest) => void;
}) {
  const code = row.lot.code;
  const grade = GRADE_LABELS[row.grade];
  return (
    <div className="flex items-center justify-end gap-2 max-md:justify-start">
      {exitOffer && (
        <Button
          aria-label={`Registrar salida de ${grade} del lote ${code}`}
          className="max-md:flex-1"
          disabled={exitOffer.disabledReason !== null}
          onClick={() =>
            onAction({ action: 'salida', lotId: row.lot.id, grade: row.grade })
          }
          size="office"
          title={exitOffer.disabledReason ?? undefined}
          variant="action"
        >
          <PackageMinus aria-hidden="true" className="size-4" />
          Registrar salida
        </Button>
      )}
      {moveOffer && (
        <ActionsMenu label={`Más acciones del lote ${code}`}>
          <MenuItem
            disabled={moveOffer.disabledReason !== null}
            onClick={() => onAction({ action: 'mover', lotId: row.lot.id })}
          >
            <MoveRight aria-hidden="true" className="size-4" />
            {moveOffer.label}
          </MenuItem>
        </ActionsMenu>
      )}
      {lotHref && <LotEyeLink code={code} href={lotHref(row.lot.id)} />}
    </div>
  );
}
