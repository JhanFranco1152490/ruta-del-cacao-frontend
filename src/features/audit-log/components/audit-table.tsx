import { Trash2 } from 'lucide-react';

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
import { formatNumericDateTime } from '@/lib/format/dates';

import type { AuditEntry } from '../api';
import { AuditChangeList } from './audit-change-list';

// La bitácora en cuatro columnas, para caber sin desplazarse a 1280 px: cuándo y quién, el registro,
// la acción y lo que cambió. Es de solo lectura: ninguna fila abre nada. En celular cada fila es
// una tarjeta con la acción de título, la fecha y quién debajo, el registro y los cambios; sin
// flecha de «ver», así que no necesita el margen derecho que la tabla compacta le deja.
export function AuditTable({ entries }: { entries: readonly AuditEntry[] }) {
  return (
    <Table
      aria-label="Bitácora de cambios"
      className={`${COMPACT_TABLE_CLASS} max-md:[&_tr]:pr-3!`}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Registro</TableHead>
          <TableHead>Acción</TableHead>
          <TableHead>Cambios</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow className="align-top" key={entry.id}>
            <TableCell className="max-md:order-2 max-md:text-muted-foreground">
              <span className="block tabular-nums">
                {formatNumericDateTime(entry.occurred_at)}
              </span>
              <span
                className={`block ${entry.actor ? 'md:text-muted-foreground' : 'text-muted-foreground italic'}`}
              >
                {entry.actor?.full_name ?? 'Cuenta eliminada'}
              </span>
            </TableCell>
            <TableCell className="max-w-64 whitespace-normal max-md:order-3">
              <span className="block text-xs text-muted-foreground uppercase">
                {entry.record_type_label}
              </span>
              <span className="block">{entry.record.label}</span>
              {entry.record.deleted && (
                <span className="mt-1 inline-block">
                  <StatusBadge icon={Trash2} tone="info">
                    Eliminado
                  </StatusBadge>
                </span>
              )}
            </TableCell>
            <TableCell className="font-bold whitespace-normal text-selva max-md:order-1">
              {entry.action_label}
            </TableCell>
            <TableCell className="whitespace-normal max-md:order-4 max-md:mt-1">
              <AuditChangeList changes={entry.changes} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
