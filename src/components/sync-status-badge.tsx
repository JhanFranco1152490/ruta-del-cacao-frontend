import { Badge } from '@/components/ui/badge';

import type { SyncStatus } from './use-sync-status';

export function SyncStatusBadge({ status }: { status: SyncStatus }) {
  if (!status.isOnline) {
    return (
      <Badge variant="warn">Sin conexión · {status.pendingCount} en cola</Badge>
    );
  }
  if (status.errorCount > 0) {
    return <Badge variant="err">{status.errorCount} con error</Badge>;
  }
  if (status.pendingCount > 0) {
    return <Badge variant="info">Sincronizando {status.pendingCount}…</Badge>;
  }
  return <Badge variant="ok">Sincronizado</Badge>;
}
