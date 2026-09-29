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

type RoleGroup = { key: string; name: string; items: Role[] };

// La asociación ve roles propios de varios productores: se separan por productor para que
// no se confundan dos roles con el mismo nombre. Un productor solo ve los suyos.
function groupRoles(roles: Role[], byProducer: boolean): RoleGroup[] {
  const groups: RoleGroup[] = [
    {
      key: 'system',
      name: 'Roles del sistema',
      items: roles.filter((role) => role.kind !== 'custom'),
    },
  ];
  const custom = roles.filter((role) => role.kind === 'custom');
  if (!byProducer) {
    groups.push({ key: 'custom', name: 'Roles propios', items: custom });
    return groups;
  }
  const byId = new Map<string, RoleGroup>();
  for (const role of custom) {
    const key = role.producer?.id ?? 'custom';
    let group = byId.get(key);
    if (!group) {
      group = {
        key,
        name: role.producer
          ? `Roles propios de ${role.producer.member_code}`
          : 'Roles propios',
        items: [],
      };
      byId.set(key, group);
    }
    group.items.push(role);
  }
  return [
    ...groups,
    ...[...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

export function RoleTable({
  roles,
  open,
  byProducer = false,
}: {
  roles: Role[];
  open: (id: string) => void;
  byProducer?: boolean;
}) {
  return (
    <div className="space-y-6">
      {groupRoles(roles, byProducer)
        .filter((group) => group.items.length)
        .map((group) => (
          <section key={group.key}>
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
