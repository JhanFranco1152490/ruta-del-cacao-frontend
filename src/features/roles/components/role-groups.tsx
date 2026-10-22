import { CollapsibleGroupList } from '@/components/collapsible-group';
import type { useGroupCollapse } from '@/hooks/use-group-collapse';
import { producerLabelOf } from '@/lib/format/producer';
import { groupInOrder, type ItemGroup } from '@/lib/group-in-order';

import type { Role } from '../api';
import { RoleTable } from './role-table';

const SYSTEM_KEY = 'system';
const CUSTOM_KEY = 'custom';

// Los roles del sistema van aparte; los propios, juntos si quien mira es un productor, o uno por
// productor para la asociación, que ve los de varios y no debe confundir dos con el mismo nombre.
export function groupRoles(
  roles: Role[],
  byProducer: boolean,
): ItemGroup<Role>[] {
  const system: ItemGroup<Role> = {
    key: SYSTEM_KEY,
    title: 'Roles del sistema',
    items: roles.filter((role) => role.kind !== 'custom'),
  };
  const custom = roles.filter((role) => role.kind === 'custom');
  const ownGroups = byProducer
    ? groupInOrder(
        custom,
        (role) => role.producer?.id ?? CUSTOM_KEY,
        (role) =>
          role.producer
            ? `Roles propios de ${producerLabelOf(role.producer)}`
            : 'Roles propios',
      ).sort((a, b) => a.title.localeCompare(b.title))
    : [{ key: CUSTOM_KEY, title: 'Roles propios', items: custom }];
  return [system, ...ownGroups].filter((group) => group.items.length);
}

export function RoleGroups({
  groups,
  collapse,
  open,
}: {
  groups: ItemGroup<Role>[];
  collapse: ReturnType<typeof useGroupCollapse>;
  open: (id: string) => void;
}) {
  return (
    <CollapsibleGroupList collapse={collapse} groups={groups}>
      {(roles) => <RoleTable open={open} roles={roles} />}
    </CollapsibleGroupList>
  );
}
