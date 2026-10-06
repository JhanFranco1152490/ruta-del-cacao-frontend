import { cn } from 'cn';

import { StatusBadge } from '@/components/status-badge';

import type { Account } from '../api';
import { AccountTable } from './account-table';

type AccountGroup = {
  key: string;
  title: string;
  accounts: Account[];
  active: boolean;
};

const ASSOCIATION_KEY = 'asociacion';

// La lista ya viene ordenada por productor desde el servidor, así que las cuentas de un mismo
// productor son vecinas y un grupo solo se parte si la página termina en medio de él. El del
// productor activo pasa al principio de la página.
export function groupAccounts(
  accounts: Account[],
  activeProducerId?: string,
): AccountGroup[] {
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
        active: key === activeProducerId,
      };
      byKey.set(key, group);
    }
    group.accounts.push(account);
  }
  return [...byKey.values()].sort(
    (a, b) => Number(b.active) - Number(a.active),
  );
}

// "Todos" para la cuenta técnica: un grupo por productor. El activo va abierto y resaltado; los
// demás, plegados, para que una lista larga no oculte lo que se está trabajando.
export function AccountGroups({
  accounts,
  activeProducerId,
  open,
  municipalityName,
}: {
  accounts: Account[];
  activeProducerId?: string;
  open: (id: string) => void;
  municipalityName?: (code: string) => string;
}) {
  return (
    <div className="space-y-4">
      {groupAccounts(accounts, activeProducerId).map((group) => (
        <details
          key={group.key}
          open={group.active || undefined}
          className={cn(
            'rounded-lg border border-border',
            group.active && 'border-cobre',
          )}
        >
          <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-3 px-4 py-2 font-serif text-xl text-selva">
            {group.title}
            {group.active && <StatusBadge tone="info">Activo</StatusBadge>}
            <span className="ml-auto font-sans text-sm text-muted-foreground">
              {group.accounts.length} en esta página
            </span>
          </summary>
          <div className="px-2 pb-4">
            <AccountTable
              accounts={group.accounts}
              open={open}
              municipalityName={municipalityName}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
