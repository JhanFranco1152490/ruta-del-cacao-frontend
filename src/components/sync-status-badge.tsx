import { StatusBadge } from '@/components/status-badge';
import type { SyncStatus } from '@/types/sync';

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (!status.isOnline) {
    return (
      <StatusBadge tone="warn">
        Sin conexión · {status.pendingCount} en cola
      </StatusBadge>
    );
  }
  if (status.errorCount > 0) {
    return <StatusBadge tone="err">{status.errorCount} con error</StatusBadge>;
  }
  if (status.pendingCount > 0) {
    return (
      <StatusBadge tone="info">
        Sincronizando {status.pendingCount}…
      </StatusBadge>
    );
  }
  return <StatusBadge tone="ok">Sincronizado</StatusBadge>;
}
