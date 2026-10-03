import { StatusBadge } from '@/components/status-badge';

const QUEUE_STATUS_DISPLAY = {
  pending: { label: 'Pendiente de sincronización', tone: 'info' },
  error: { label: 'Pendiente con error', tone: 'err' },
  synced: { label: 'Guardada en el servidor', tone: 'ok' },
} as const;

export type PlotQueueStatus = keyof typeof QUEUE_STATUS_DISPLAY;

// El estado de una parcela que pasó por la cola del dispositivo.
export function PlotQueueBadge({ status }: { status: PlotQueueStatus }) {
  const { label, tone } = QUEUE_STATUS_DISPLAY[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
