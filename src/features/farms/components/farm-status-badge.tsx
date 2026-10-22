import { StatusBadge } from '@/components/status-badge';

import { FARM_STATUS_DISPLAY, type FarmDisplayStatus } from '../farm-status';

export function FarmStatusBadge({ status }: { status: FarmDisplayStatus }) {
  const { label, tone } = FARM_STATUS_DISPLAY[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
