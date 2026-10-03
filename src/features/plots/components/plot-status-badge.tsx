import { StatusBadge } from '@/components/status-badge';

import { PLOT_STATUS_DISPLAY, type PlotDisplayStatus } from '../plot-status';

export function PlotStatusBadge({ status }: { status: PlotDisplayStatus }) {
  const { label, tone } = PLOT_STATUS_DISPLAY[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
