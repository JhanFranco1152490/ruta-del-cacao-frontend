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

import type { PestDisease } from '../pest-api';
import { PestFormDialog } from './pest-form-dialog';
import { PestStatusDialog } from './pest-status-dialog';

// Cada fila con el mismo espacio arriba y abajo: el contenido se centra en la altura de la fila, que
// la marcan los botones o la descripción (a lo sumo dos líneas). Sin flecha que cubra la tarjeta en
// celular, no hace falta su espacio a la derecha.
const CELL = 'py-3 align-middle md:whitespace-normal';

// Un grupo del catálogo (las plagas o las enfermedades). Las columnas tienen ancho fijo para que
// los dos grupos queden alineados uno debajo del otro.
export function PestTable({
  label,
  items,
  catalog,
}: {
  label: string;
  items: readonly PestDisease[];
  // Todo el catálogo, para que el formulario rechace un nombre repetido.
  catalog: readonly PestDisease[];
}) {
  return (
    <Table
      aria-label={label}
      className={cn(COMPACT_TABLE_CLASS, 'md:table-fixed max-md:[&_tr]:pr-3!')}
    >
      <TableHeader>
        <TableRow>
          <TableHead className="md:w-64">Nombre</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead className="md:w-32 md:pl-6">Estado</TableHead>
          <TableHead className="md:w-60">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableHead
              className={cn(
                CELL,
                'h-auto font-normal max-md:order-1 max-md:p-0 max-md:whitespace-normal',
              )}
              scope="row"
            >
              <span className="block text-base font-bold text-selva">
                {item.name}
              </span>
              {item.scientific_name && (
                <i className="block text-sm text-muted-foreground">
                  {item.scientific_name}
                </i>
              )}
            </TableHead>
            <TableCell
              className={cn(
                CELL,
                'text-muted-foreground max-md:order-3 max-md:mt-1',
              )}
            >
              <p className="line-clamp-2 max-w-xl">{item.description}</p>
            </TableCell>
            <TableCell
              className={cn(
                CELL,
                'max-md:order-2 max-md:col-span-1! max-md:justify-self-end md:pl-6',
              )}
            >
              <StatusBadge tone={item.is_active ? 'ok' : 'warn'}>
                {item.is_active ? 'Activa' : 'Inactiva'}
              </StatusBadge>
            </TableCell>
            <TableCell className={cn(CELL, 'max-md:order-4 max-md:mt-2')}>
              <div className="flex justify-end gap-3">
                <PestFormDialog catalog={catalog} item={item} />
                <PestStatusDialog item={item} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
