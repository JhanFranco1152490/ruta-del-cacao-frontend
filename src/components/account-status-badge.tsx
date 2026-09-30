import { StatusBadge } from '@/components/status-badge';
import type { Account } from '@/lib/api/accounts';
export function AccountStatusBadge({
  account,
}: {
  account: Pick<Account, 'status' | 'activation_pending'> & {
    producer?: Account['producer'];
  };
}) {
  if (account.status === 'inactive' || account.producer?.status === 'inactive')
    return <StatusBadge tone="err">Inactiva</StatusBadge>;
  if (account.activation_pending)
    return <StatusBadge tone="warn">Pendiente de activación</StatusBadge>;
  return <StatusBadge tone="ok">Activa</StatusBadge>;
}
