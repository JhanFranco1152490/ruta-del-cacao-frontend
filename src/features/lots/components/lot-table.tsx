import { cn } from 'cn';
import { ChevronRight, Eye } from 'lucide-react';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { EditorLink } from '@/components/editor-link';
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
import { formatAbbreviatedDate } from '@/lib/format/dates';
import { farmLabel, plotLabel } from '@/lib/format/place-label';
import type { LotAction } from '@/lib/lot-actions';

import type { Lot } from '../api';
import { lotDetailPath } from '../lot-paths';
import { LotActionsMenu } from './lot-actions-menu';
import { LotStatusBadge } from './lot-status-badge';

// Los lotes de una página: una tabla en escritorio y tarjetas compactas en celular. El código va
// completo, como se imprime en el costal. En celular, cuatro líneas con los datos alineados en dos
// columnas: el código; el origen; la fecha y el peso; la variedad y el estado.
export function LotTable({
  lots,
  lotActions,
}: {
  lots: readonly Lot[];
  // Lo que se hace con un lote en su etapa: lo da quien monta la pantalla.
  lotActions?: (lot: Lot) => readonly LotAction[];
}) {
  return (
    <Table aria-label="Lotes" className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Cosecha</TableHead>
          <TableHead>Origen</TableHead>
          <TableHead>Variedad</TableHead>
          <TableHead className="text-right">Peso en verde</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lots.map((lot) => (
          <TableRow key={lot.id}>
            <TableCell className="font-mono font-bold break-all whitespace-normal max-md:order-1 max-md:text-base! max-md:text-foreground">
              {lot.code}
            </TableCell>
            <TableCell className="max-md:order-3 max-md:col-span-1! max-md:text-muted-foreground">
              {formatAbbreviatedDate(lot.harvest.harvest_date)}
            </TableCell>
            <TableCell className="max-w-64 break-words whitespace-normal max-md:order-2">
              {plotLabel(lot.harvest.plot)}
              <span className="block text-sm text-muted-foreground">
                {farmLabel(lot.harvest.plot.farm)}
              </span>
            </TableCell>
            <TableCell className="max-md:order-5 max-md:col-span-1! max-md:text-muted-foreground">
              {lot.harvest.variety.name}
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums max-md:order-4 max-md:col-span-1! max-md:justify-self-end">
              {formatDecimal(lot.green_weight_kg, 1)} kg
            </TableCell>
            <TableCell className="max-md:order-6 max-md:col-span-1! max-md:justify-self-end">
              <LotStatusBadge status={lot.status} />
              {/* Dónde fermenta: lo que se busca al recorrer los cajones. */}
              {lot.fermentation && !lot.fermentation.ended_at && (
                <span className="block text-sm text-muted-foreground">
                  En {lot.fermentation.facility}
                </span>
              )}
            </TableCell>
            <TableCell className="max-md:order-7">
              <div className="flex items-center justify-end gap-2">
                <EditorLink
                  aria-label={`Ver el lote ${lot.code}`}
                  className={cn(
                    buttonVariants({ size: 'office', variant: 'action' }),
                    ROW_LINK_CLASS,
                  )}
                  href={lotDetailPath(lot.id)}
                >
                  <Eye aria-hidden="true" className="size-4 max-md:hidden" />
                  <span className="max-md:sr-only">Ver</span>
                  <ChevronRight aria-hidden="true" className="md:hidden" />
                </EditorLink>
                {/* En celular la tarjeta entera es el enlace: el menú queda arriba a la derecha,
                    por encima de él. */}
                <LotActionsMenu
                  actions={lotActions?.(lot) ?? []}
                  className="max-md:absolute max-md:top-1.5 max-md:right-1.5 max-md:z-10 max-md:h-9"
                  code={lot.code}
                  // Sin acciones en esta etapa, el hueco del «⋯» se conserva: así el «Ver» de
                  // todas las filas queda alineado.
                  placeholderClassName="max-md:hidden"
                  reserveSpace={lotActions !== undefined}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
