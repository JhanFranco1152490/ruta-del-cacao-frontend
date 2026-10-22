import { CollapsibleGroupList } from '@/components/collapsible-group';
import type { useGroupCollapse } from '@/hooks/use-group-collapse';
import { producerLabelOf } from '@/lib/format/producer';
import { groupInOrder, type ItemGroup } from '@/lib/group-in-order';

import type { Account } from '../api';
import { AccountTable } from './account-table';

const ASSOCIATION_KEY = 'asociacion';

// La lista ya viene ordenada por productor desde el servidor: las cuentas de un productor son
// vecinas y un grupo solo se parte si la página termina en medio de él.
export function groupAccounts(accounts: Account[]): ItemGroup<Account>[] {
  return groupInOrder(
    accounts,
    (account) => account.producer?.id ?? ASSOCIATION_KEY,
    (account) =>
      account.producer ? producerLabelOf(account.producer) : 'Asociación',
  );
}

export function AccountGroups({
  groups,
  collapse,
  open,
}: {
  groups: ItemGroup<Account>[];
  collapse: ReturnType<typeof useGroupCollapse>;
  open: (id: string) => void;
}) {
  return (
    <CollapsibleGroupList collapse={collapse} groups={groups}>
      {(accounts) => <AccountTable accounts={accounts} open={open} />}
    </CollapsibleGroupList>
  );
}
