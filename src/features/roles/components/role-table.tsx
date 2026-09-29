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

export function RoleTable({
  roles,
  open,
}: {
  roles: Role[];
  open: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {[
        {
          name: 'Roles del sistema',
          items: roles.filter((role) => role.kind !== 'custom'),
        },
        {
          name: 'Roles propios',
          items: roles.filter((role) => role.kind === 'custom'),
        },
      ]
        .filter((group) => group.items.length)
        .map((group) => (
          <section key={group.name}>
            <h2 className="mb-3 font-serif text-2xl text-selva">
              {group.name}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Permisos</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.items.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="max-w-64 font-bold break-words whitespace-normal">
                      {role.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone="info">
                        {role.kind === 'custom'
                          ? 'Propio'
                          : role.kind === 'fixed'
                            ? 'Fijo'
                            : 'Predefinido'}
                      </StatusBadge>
                    </TableCell>
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
          </section>
        ))}
    </div>
  );
}
