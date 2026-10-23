'use client';

import { cn } from 'cn';
import { CloudUpload, Pencil } from 'lucide-react';

import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatShortDateTime } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import { turnCorrectionPath } from '../fermentation-paths';
import { hoursText } from '../fermentation-time';
import type { TurnRow } from '../turn-rows';
import { TurnDeleteDialog } from './turn-delete-dialog';

// Los volteos de la fermentación, del primero al último: la línea de tiempo del lote. En celular
// cada fila es una tarjeta compacta. Corregir y eliminar se ofrecen mientras la fermentación sigue,
// solo en los del servidor y con conexión.
export function TurnsTable({
  lotId,
  rows,
  editable,
  online,
}: {
  lotId: string;
  rows: readonly TurnRow[];
  editable: boolean;
  online: boolean;
}) {
  const serverCount = rows.filter(({ turn }) => turn).length;
  return (
    <Table aria-label="Volteos" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Volteo</TableHead>
          <TableHead>Fecha y hora</TableHead>
          <TableHead>Desde el inicio</TableHead>
          <TableHead>Temperatura</TableHead>
          <TableHead>pH</TableHead>
          <TableHead>Observaciones</TableHead>
          <TableHead>Registró</TableHead>
          {editable && (
            <TableHead>
              <span className="sr-only">Acciones</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-bold max-md:col-span-1! max-md:text-base!">
              Volteo {row.number}
            </TableCell>
            <TableCell className="max-md:col-span-1! max-md:justify-self-end">
              {formatShortDateTime(row.turnedAt)}
            </TableCell>
            <TableCell className="max-md:col-span-1! max-md:text-muted-foreground">
              {hoursText(row.hours)}
            </TableCell>
            <TableCell className="tabular-nums max-md:col-span-1!">
              {formatDecimal(row.temperature, 1)} °C
            </TableCell>
            <TableCell className="tabular-nums max-md:col-span-1! max-md:justify-self-end">
              <span className="md:hidden">pH </span>
              {formatDecimal(row.ph, 2)}
            </TableCell>
            <TableCell className="max-w-56 break-words whitespace-normal">
              {row.notes || '—'}
            </TableCell>
            <TableCell className="max-md:text-muted-foreground">
              {row.pending ? (
                <span className="inline-flex items-center gap-1 font-bold text-warn">
                  <CloudUpload aria-hidden="true" className="size-4" />
                  Pendiente de enviar
                </span>
              ) : (
                row.recordedBy
              )}
            </TableCell>
            {editable && (
              <TableCell>
                {row.turn && (
                  <div className="flex flex-wrap gap-2 max-md:mt-2">
                    {online ? (
                      <EditorLink
                        aria-label={`Corregir el volteo ${row.number}`}
                        className={cn(
                          buttonVariants({ size: 'office', variant: 'action' }),
                          'h-10',
                        )}
                        href={turnCorrectionPath(lotId, row.turn.id)}
                      >
                        <Pencil aria-hidden="true" className="size-4" />{' '}
                        Corregir
                      </EditorLink>
                    ) : (
                      <Button
                        className="h-10"
                        disabled
                        size="office"
                        variant="action"
                      >
                        <Pencil aria-hidden="true" className="size-4" />{' '}
                        Corregir
                      </Button>
                    )}
                    <TurnDeleteDialog
                      disabled={!online}
                      isOnly={serverCount === 1}
                      lotId={lotId}
                      number={row.number}
                      turn={row.turn}
                    />
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
