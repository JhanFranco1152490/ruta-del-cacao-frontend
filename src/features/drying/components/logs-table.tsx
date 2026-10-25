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
import { formatShortDate } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';

import { logCorrectionPath } from '../drying-paths';
import { WEATHERS } from '../log-form';
import type { LogRow } from '../log-rows';
import { LogDeleteDialog } from './log-delete-dialog';

// En escritorio los botones son de solo icono (el nombre lo lleva el `aria-label`): con texto, la
// columna de acciones empujaba la tabla fuera de la ficha y obligaba a desplazarla de lado.
const ICON_BUTTON_CLASS = 'h-10 md:w-10 md:px-0';

const weatherLabel = (row: LogRow) =>
  WEATHERS.find(({ value }) => value === row.weather)?.label ?? '—';

// «6,0 h al sol» y, si hubo, «2,0 h a la sombra».
function SunShade({ row }: { row: LogRow }) {
  return (
    <>
      <span className="block">
        {formatFixedDecimal(row.sunHours ?? 0, 1)} h al sol
      </span>
      {row.shadeHours && (
        <span className="block text-xs text-muted-foreground">
          {formatFixedDecimal(row.shadeHours, 1)} h a la sombra
        </span>
      )}
    </>
  );
}

function Turns({ row }: { row: LogRow }) {
  if (!row.turnCount) return <>Sin volteos</>;
  const count = row.turnCount === 1 ? '1 volteo' : `${row.turnCount} volteos`;
  return (
    <>
      {count}
      {row.turnFrequency && (
        <span className="block text-xs text-muted-foreground">
          cada {formatFixedDecimal(row.turnFrequency, 1)} h
        </span>
      )}
    </>
  );
}

// Las bitácoras del secado, día por día: la línea de tiempo del lote. Un día sin bitácora es una
// fila tenue. En celular cada fila es una tarjeta compacta. Corregir y eliminar se ofrecen mientras
// el secado sigue, solo en las del servidor y con conexión.
export function LogsTable({
  lotId,
  rows,
  editable,
  online,
}: {
  lotId: string;
  rows: readonly LogRow[];
  editable: boolean;
  online: boolean;
}) {
  const serverCount = rows.filter(({ log }) => log).length;
  return (
    <Table aria-label="Bitácoras" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Día</TableHead>
          <TableHead>Humedad y clima</TableHead>
          <TableHead>Horas</TableHead>
          <TableHead>Volteos</TableHead>
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
          <TableRow key={row.day}>
            <TableCell className="font-bold max-md:col-span-1! max-md:text-base!">
              Día {row.day}
              <span className="block text-xs font-normal text-muted-foreground">
                {formatShortDate(row.date)}
              </span>
            </TableCell>
            {row.empty ? (
              <TableCell
                className="text-muted-foreground max-md:col-span-1! max-md:justify-self-end max-md:text-right"
                colSpan={editable ? 5 : 4}
              >
                Sin bitácora
              </TableCell>
            ) : (
              <>
                <TableCell className="font-bold tabular-nums max-md:col-span-1! max-md:justify-self-end">
                  {formatFixedDecimal(row.moisture ?? 0, 1)} %
                  <span className="block text-xs font-normal text-muted-foreground">
                    {weatherLabel(row)}
                  </span>
                </TableCell>
                <TableCell className="max-md:col-span-1!">
                  <SunShade row={row} />
                </TableCell>
                <TableCell className="max-md:col-span-1! max-md:justify-self-end">
                  <Turns row={row} />
                </TableCell>
                <TableCell className="max-w-52 break-words whitespace-normal">
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
                    {row.log && (
                      <div className="flex gap-2 max-md:mt-2 md:justify-end">
                        {online ? (
                          <EditorLink
                            aria-label={`Corregir la bitácora del día ${row.day}`}
                            className={cn(
                              buttonVariants({
                                size: 'office',
                                variant: 'action',
                              }),
                              ICON_BUTTON_CLASS,
                            )}
                            href={logCorrectionPath(lotId, row.log.id)}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                            <span className="md:sr-only">Corregir</span>
                          </EditorLink>
                        ) : (
                          <Button
                            aria-label={`Corregir la bitácora del día ${row.day}`}
                            className={ICON_BUTTON_CLASS}
                            disabled
                            size="office"
                            variant="action"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                            <span className="md:sr-only">Corregir</span>
                          </Button>
                        )}
                        <LogDeleteDialog
                          className={ICON_BUTTON_CLASS}
                          disabled={!online}
                          isOnly={serverCount === 1}
                          log={row.log}
                          lotId={lotId}
                        />
                      </div>
                    )}
                  </TableCell>
                )}
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
