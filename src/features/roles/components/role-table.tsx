import { cn } from 'cn';

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

type RoleGroup = {
  key: string;
  name: string;
  items: Role[];
  active: boolean;
};

const SYSTEM_KEY = 'system';

// La asociación ve roles propios de varios productores: se separan por productor para que
// no se confundan dos roles con el mismo nombre. Un productor solo ve los suyos.
function groupRoles(
  roles: Role[],
  byProducer: boolean,
  activeProducerId?: string,
): RoleGroup[] {
  const groups: RoleGroup[] = [
    {
      key: SYSTEM_KEY,
      name: 'Roles del sistema',
      items: roles.filter((role) => role.kind !== 'custom'),
      active: false,
    },
  ];
  const custom = roles.filter((role) => role.kind === 'custom');
  if (!byProducer) {
    groups.push({
      key: 'custom',
      name: 'Roles propios',
      items: custom,
      active: false,
    });
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
          ? `Roles propios de ${role.producer.first_name} ${role.producer.last_name} · ${role.producer.member_code}`
          : 'Roles propios',
        items: [],
        active: key === activeProducerId,
      };
      byId.set(key, group);
    }
    group.items.push(role);
  }
  return [
    ...groups,
    // El del productor activo, primero; los demás, por nombre.
    ...[...byId.values()].sort(
      (a, b) =>
        Number(b.active) - Number(a.active) || a.name.localeCompare(b.name),
    ),
  ];
}

function GroupTable({
  items,
  open,
}: {
  items: Role[];
  open: (id: string) => void;
}) {
  return (
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
        {items.map((role) => (
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
  );
}

export function RoleTable({
  roles,
  open,
  byProducer = false,
  activeProducerId,
  collapseOthers = false,
}: {
  roles: Role[];
  open: (id: string) => void;
  byProducer?: boolean;
  // El productor activo de la cuenta técnica: va primero y resaltado.
  activeProducerId?: string;
  // La cuenta técnica viendo "Todos": los grupos de los demás productores van plegados, y el activo
  // y el de los roles del sistema, abiertos.
  collapseOthers?: boolean;
}) {
  return (
    <div className="space-y-6">
      {groupRoles(roles, byProducer, activeProducerId)
        .filter((group) => group.items.length)
        .map((group) =>
          collapseOthers && group.key !== SYSTEM_KEY ? (
            <details
              key={group.key}
              open={group.active || undefined}
              className={cn(
                'rounded-lg border border-border',
                group.active && 'border-cobre',
              )}
            >
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 px-4 py-2 font-serif text-2xl text-selva">
                {group.name}
                {group.active && <StatusBadge tone="info">Activo</StatusBadge>}
                <span className="ml-auto font-sans text-sm text-muted-foreground">
                  {group.items.length} en esta página
                </span>
              </summary>
              <div className="px-2 pb-4">
                <GroupTable items={group.items} open={open} />
              </div>
            </details>
          ) : (
            <section key={group.key}>
              <h2 className="mb-3 font-serif text-2xl text-selva">
                {group.name}
              </h2>
              <GroupTable items={group.items} open={open} />
            </section>
          ),
        )}
    </div>
  );
}
