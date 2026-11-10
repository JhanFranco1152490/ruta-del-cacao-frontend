import { StatusBadge } from '@/components/status-badge';

import type { SaleStatus } from '../api';
import { SALE_STATUSES } from '../sale-status';

// El estado de una venta, con su ícono y su texto.
export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const { label, tone, Icon } = SALE_STATUSES[status];
  return (
    <StatusBadge icon={Icon} tone={tone}>
      {label}
    </StatusBadge>
  );
}
