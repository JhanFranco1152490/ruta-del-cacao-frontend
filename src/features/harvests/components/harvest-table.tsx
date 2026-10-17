import { cn } from 'cn';
import { ChevronRight, Eye, Package } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { EditorLink } from '@/components/editor-link';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDecimal } from '@/lib/format/decimal';
import { formatWeekdayDate } from '@/lib/format/dates';

import type { HarvestLotSource } from '../harvest-lot-source';
import { harvestDetailPath } from '../harvest-paths';
import type { HarvestRow } from '../harvest-rows';

type RenderFormLot = (
  source: HarvestLotSource,
  unavailable: ReactNode,
) => ReactNode;

// En la columna del lote: su código, o conformarlo si todavía no forma uno («Sin lote» si no se
// puede). Lo del teléfono dice que espera y también se puede conformar. En celular el botón queda
// encima del enlace que cubre la tarjeta.
function LotCell({
  row,
  renderFormLot,
}: {
  row: HarvestRow;
  renderFormLot?: RenderFormLot;
}) {
  if (row.queue === 'error') {
    return <StatusBadge tone="err">No se pudo enviar</StatusBadge>;
  }
  if (row.lotCode) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-alt px-2 py-1 font-mono text-xs">
        <Package aria-hidden="true" className="size-3.5" />
        {row.lotCode}
      </span>
    );
  }
  const withoutLot = <span className="text-muted-foreground">Sin lote</span>;
  const formLot =
    row.lotSource && renderFormLot ? (
      <span className="relative z-10 inline-flex">
        {renderFormLot(row.lotSource, withoutLot)}
      </span>
    ) : null;
  if (row.queue) {
    // La cosecha espera en el teléfono; su lote se puede conformar igual y espera con ella.
    return (
      <span className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="warn">Pendiente de enviar</StatusBadge>
        {formLot}
      </span>
    );
  }
  return formLot ?? withoutLot;
}

// Las cosechas del mes: una tabla en escritorio y tarjetas compactas en celular. Una del servidor
// abre su detalle; una del teléfono todavía no tiene detalle (se corrige desde la bandeja).
export function HarvestTable({
  rows,
  renderFormLot,
}: {
  rows: readonly HarvestRow[];
  renderFormLot?: RenderFormLot;
}) {
  return (
    <Table aria-label="Cosechas del mes" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Parcela de origen</TableHead>
          <TableHead>Variedad</TableHead>
          <TableHead className="text-right">Peso en verde</TableHead>
          <TableHead>Recolector</TableHead>
          <TableHead>Lote</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="first-letter:uppercase max-md:order-3 max-md:col-span-1! max-md:text-muted-foreground">
              {formatWeekdayDate(row.date)}
            </TableCell>
            <TableCell className="max-w-64 font-bold break-words whitespace-normal max-md:order-1 max-md:col-span-1! max-md:text-base! max-md:text-foreground">
              {row.plot}
              {row.farm && (
                <span className="block text-sm font-normal text-muted-foreground">
                  {row.farm}
                </span>
              )}
            </TableCell>
            <TableCell className="max-md:order-4 max-md:col-span-1!">
              {row.variety ?? '—'}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
              {formatDecimal(row.weightKg, 1)} kg
            </TableCell>
            <TableCell className="max-md:order-5 max-md:text-muted-foreground">
              {row.collector ?? '—'}
            </TableCell>
            <TableCell className="max-md:order-6">
              <LotCell renderFormLot={renderFormLot} row={row} />
            </TableCell>
            <TableCell className="max-md:order-7">
              {!row.queue && (
                <EditorLink
                  aria-label={`Ver la cosecha de ${row.plot} del ${formatWeekdayDate(row.date)}`}
                  className={cn(
                    buttonVariants({ size: 'office', variant: 'action' }),
                    ROW_LINK_CLASS,
                  )}
                  href={harvestDetailPath(row.id)}
                >
                  <Eye aria-hidden="true" className="size-4 max-md:hidden" />
                  <span className="max-md:sr-only">Ver</span>
                  <ChevronRight aria-hidden="true" className="md:hidden" />
                </EditorLink>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
