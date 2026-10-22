import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronRight } from 'lucide-react';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { StatusBadge } from '@/components/status-badge';
import type { Role } from '../api';

const KIND_LABEL: Record<Role['kind'], string> = {
  custom: 'Propio',
  fixed: 'Fijo',
  predefined: 'Predefinido',
};

export function RoleTable({
  roles,
  open,
  showProducer = false,
}: {
  roles: Role[];
  open: (id: string) => void;
  // Fuera de un grupo por productor, un rol propio dice de quién es.
  showProducer?: boolean;
}) {
  return (
    // Anchos fijos (desde `md`): con la vista por productor cada grupo es una tabla aparte, y sin
    // ellos cada una repartía sus columnas distinto y no quedaban alineadas.
    <Table className={`${COMPACT_TABLE_CLASS} md:table-fixed`}>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="md:w-40">Tipo</TableHead>
          {showProducer && (
            <TableHead className="md:w-[30%]">Productor</TableHead>
          )}
          <TableHead className="md:w-28">Permisos</TableHead>
          <TableHead className="md:w-32">
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="max-w-64 font-bold break-words whitespace-normal max-md:order-1 max-md:text-base! max-md:text-foreground">
              {role.name}
            </TableCell>
            <TableCell className="max-md:order-2 max-md:col-span-1!">
              <StatusBadge tone="info">{KIND_LABEL[role.kind]}</StatusBadge>
            </TableCell>
            {showProducer && (
              <TableCell
                className={`max-w-64 break-words whitespace-normal max-md:order-4 ${role.producer ? '' : 'max-md:hidden'}`}
              >
                {role.producer
                  ? `${role.producer.first_name} ${role.producer.last_name} · ${role.producer.member_code}`
                  : '—'}
              </TableCell>
            )}
            <TableCell className="max-md:order-3 max-md:col-span-1! max-md:self-center max-md:justify-self-end">
              {role.permissions.length}
              <span className="md:hidden"> permisos</span>
            </TableCell>
            <TableCell className="max-md:order-5">
              <Button
                variant="outline"
                onClick={() => open(role.id)}
                aria-label={`Ver rol ${role.name}`}
                className={ROW_LINK_CLASS}
              >
                <span className="max-md:sr-only">Ver rol</span>
                <ChevronRight aria-hidden="true" className="md:hidden" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
