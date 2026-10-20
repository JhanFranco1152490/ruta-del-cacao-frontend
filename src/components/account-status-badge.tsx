import { StatusBadge } from '@/components/status-badge';
import type { Account } from '@/lib/api/accounts';
export function AccountStatusBadge({
  account,
}: {
  account: Pick<Account, 'status' | 'activation_pending'> & {
    producer?: Account['producer'];
  };
}) {
  // Sin el productor activo la cuenta no tiene acceso, aunque esté activa: se dice el motivo.
  if (account.producer?.status === 'inactive')
    return <StatusBadge tone="err">Inactiva · productor inactivo</StatusBadge>;
  if (account.status === 'inactive')
    return <StatusBadge tone="err">Inactiva</StatusBadge>;
  if (account.activation_pending)
    return <StatusBadge tone="warn">Pendiente de activación</StatusBadge>;
  return <StatusBadge tone="ok">Activa</StatusBadge>;
}
