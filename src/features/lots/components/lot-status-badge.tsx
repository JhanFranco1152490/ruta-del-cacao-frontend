import { StatusBadge } from '@/components/status-badge';
import { LOT_STATUSES, type LotStatus } from '@/lib/lot-status';

export function LotStatusBadge({ status }: { status: LotStatus }) {
  const { label, tone, Icon } = LOT_STATUSES[status];
  return (
    <StatusBadge icon={Icon} tone={tone}>
      {label}
    </StatusBadge>
  );
}
