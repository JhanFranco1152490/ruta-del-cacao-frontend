import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          {showProducer && <TableHead>Productor</TableHead>}
          <TableHead>Permisos</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id}>
            <TableCell className="max-w-64 font-bold break-words whitespace-normal">
              {role.name}
            </TableCell>
            <TableCell>
              <StatusBadge tone="info">{KIND_LABEL[role.kind]}</StatusBadge>
            </TableCell>
            {showProducer && (
              <TableCell className="max-w-64 break-words whitespace-normal">
                {role.producer
                  ? `${role.producer.first_name} ${role.producer.last_name} · ${role.producer.member_code}`
                  : '—'}
              </TableCell>
            )}
            <TableCell>{role.permissions.length}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                onClick={() => open(role.id)}
                aria-label={`Ver rol ${role.name}`}
              >
                Ver rol
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
