import { StatusBadge } from '@/components/status-badge';

import type { ProducerStatus } from '../api';

export function ProducerStatusBadge({ status }: { status: ProducerStatus }) {
  return status === 'active' ? (
    <StatusBadge tone="ok">Activo</StatusBadge>
  ) : (
    <StatusBadge tone="err">Inactivo</StatusBadge>
  );
}
