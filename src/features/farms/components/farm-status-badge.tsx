import { StatusBadge } from '@/components/status-badge';

export type FarmDisplayStatus = 'active' | 'inactive' | 'pending' | 'error';

// Etiqueta y tono de cada estado: los comparten el badge y el marcador del mapa.
export const FARM_STATUS_DISPLAY = {
  active: { label: 'Activa', tone: 'ok' },
  inactive: { label: 'Inactiva', tone: 'warn' },
  pending: { label: 'Pendiente de sincronización', tone: 'info' },
  error: { label: 'Pendiente con error', tone: 'err' },
} as const;

export function FarmStatusBadge({ status }: { status: FarmDisplayStatus }) {
  const { label, tone } = FARM_STATUS_DISPLAY[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
