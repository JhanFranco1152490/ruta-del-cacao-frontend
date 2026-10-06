import { CollapsibleGroup } from '@/components/collapsible-group';
import type { useGroupCollapse } from '@/hooks/use-group-collapse';
import type { Role } from '../api';
import { RoleTable } from './role-table';

type RoleGroup = { key: string; name: string; items: Role[] };

const SYSTEM_KEY = 'system';

// Los roles del sistema van aparte; los propios, juntos si quien mira es un productor, o uno por
// productor para la asociación, que ve los de varios y no debe confundir dos con el mismo nombre.
export function groupRoles(roles: Role[], byProducer: boolean): RoleGroup[] {
  const groups: RoleGroup[] = [
    {
      key: SYSTEM_KEY,
      name: 'Roles del sistema',
      items: roles.filter((role) => role.kind !== 'custom'),
    },
  ];
  const custom = roles.filter((role) => role.kind === 'custom');
  if (!byProducer) {
    groups.push({ key: 'custom', name: 'Roles propios', items: custom });
    return groups.filter((group) => group.items.length);
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
      };
      byId.set(key, group);
    }
    group.items.push(role);
  }
  return [
    ...groups,
    ...[...byId.values()].sort((a, b) => a.name.localeCompare(b.name)),
  ].filter((group) => group.items.length);
}

export function RoleGroups({
  groups,
  collapse,
  open,
}: {
  groups: RoleGroup[];
  collapse: ReturnType<typeof useGroupCollapse>;
  open: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          title={group.name}
          meta={`${group.items.length} en esta página`}
          open={collapse.isOpen(group.key)}
          onToggle={() => collapse.toggle(group.key)}
        >
          <RoleTable roles={group.items} open={open} />
        </CollapsibleGroup>
      ))}
    </div>
  );
}
