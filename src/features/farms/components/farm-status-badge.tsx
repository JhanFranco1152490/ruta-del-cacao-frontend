import { StatusBadge } from '@/components/status-badge';

export type FarmDisplayStatus = 'active' | 'inactive' | 'pending' | 'error';

const STATUS_CONFIG = {
  active: { label: 'Activa', tone: 'ok' },
  inactive: { label: 'Inactiva', tone: 'warn' },
  pending: { label: 'Pendiente de sincronización', tone: 'info' },
  error: { label: 'Pendiente con error', tone: 'err' },
} as const;

export function FarmStatusBadge({ status }: { status: FarmDisplayStatus }) {
  const { label, tone } = STATUS_CONFIG[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
