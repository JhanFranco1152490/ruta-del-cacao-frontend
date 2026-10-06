import { CollapsibleGroup } from '@/components/collapsible-group';
import type { useGroupCollapse } from '@/hooks/use-group-collapse';
import type { Account } from '../api';
import { AccountTable } from './account-table';

type AccountGroup = { key: string; title: string; accounts: Account[] };

const ASSOCIATION_KEY = 'asociacion';

// La lista ya viene ordenada por productor desde el servidor: las cuentas de un productor son
// vecinas y un grupo solo se parte si la página termina en medio de él.
export function groupAccounts(accounts: Account[]): AccountGroup[] {
  const byKey = new Map<string, AccountGroup>();
  for (const account of accounts) {
    const key = account.producer?.id ?? ASSOCIATION_KEY;
    let group = byKey.get(key);
    if (!group) {
      group = {
        key,
        title: account.producer
          ? `${account.producer.first_name} ${account.producer.last_name} · ${account.producer.member_code}`
          : 'Asociación',
        accounts: [],
      };
      byKey.set(key, group);
    }
    group.accounts.push(account);
  }
  return [...byKey.values()];
}

export function AccountGroups({
  groups,
  collapse,
  open,
}: {
  groups: AccountGroup[];
  collapse: ReturnType<typeof useGroupCollapse>;
  open: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <CollapsibleGroup
          key={group.key}
          title={group.title}
          meta={`${group.accounts.length} en esta página`}
          open={collapse.isOpen(group.key)}
          onToggle={() => collapse.toggle(group.key)}
        >
          <AccountTable accounts={group.accounts} open={open} />
        </CollapsibleGroup>
      ))}
    </div>
  );
}
