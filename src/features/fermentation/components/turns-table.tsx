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

import { turnCorrectionPath } from '../fermentation-paths';
import { hoursText } from '../fermentation-time';
import { phText, temperatureText } from '../measure-text';
import type { TurnRow } from '../turn-rows';
import { TurnDeleteDialog } from './turn-delete-dialog';

// En escritorio los botones son de solo icono (el nombre lo lleva el `aria-label`): con texto, la
// columna de acciones empujaba la tabla fuera de la ficha y obligaba a desplazarla de lado.
const ICON_BUTTON_CLASS = 'h-10 md:w-10 md:px-0';

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
          <TableHead>Temperatura</TableHead>
          <TableHead>pH</TableHead>
          <TableHead>Observaciones</TableHead>
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
            <TableCell className="max-md:col-span-1! max-md:justify-self-end max-md:text-right">
              {formatShortDateTime(row.turnedAt)}
              <span className="block text-xs text-muted-foreground">
                {hoursText(row.hours)} desde el inicio
              </span>
            </TableCell>
            <TableCell className="font-bold tabular-nums max-md:col-span-1!">
              {temperatureText(row.temperature)}
            </TableCell>
            <TableCell className="font-bold tabular-nums max-md:col-span-1! max-md:justify-self-end">
              <span className="md:hidden">pH </span>
              {phText(row.ph)}
            </TableCell>
            <TableCell className="max-w-56 break-words whitespace-normal">
              {row.notes && <span className="block">{row.notes}</span>}
              {row.pending ? (
                <span className="flex items-center gap-1 text-xs font-bold text-warn">
                  <CloudUpload aria-hidden="true" className="size-4" />
                  Pendiente de enviar
                </span>
              ) : (
                <span className="block text-xs text-muted-foreground">
                  Registró {row.recordedBy}
                </span>
              )}
            </TableCell>
            {editable && (
              <TableCell>
                {row.turn && (
                  <div className="flex gap-2 max-md:mt-2 md:justify-end">
                    {online ? (
                      <EditorLink
                        aria-label={`Corregir el volteo ${row.number}`}
                        className={cn(
                          buttonVariants({ size: 'office', variant: 'action' }),
                          ICON_BUTTON_CLASS,
                        )}
                        href={turnCorrectionPath(lotId, row.turn.id)}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        <span className="md:sr-only">Corregir</span>
                      </EditorLink>
                    ) : (
                      <Button
                        aria-label={`Corregir el volteo ${row.number}`}
                        className={ICON_BUTTON_CLASS}
                        disabled
                        size="office"
                        variant="action"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        <span className="md:sr-only">Corregir</span>
                      </Button>
                    )}
                    <TurnDeleteDialog
                      className={ICON_BUTTON_CLASS}
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
