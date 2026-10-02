import type { SyncStatus } from '@/types/sync';

export type SyncAttentionKind = 'error' | 'expired' | 'offline' | 'pending';

export type SyncAttention = {
  kind: SyncAttentionKind;
  // Pendientes más errores: lo que sigue en el dispositivo.
  count: number;
  label: string;
};

const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// Qué dice el indicador de la cabecera, o nada si todo está al día: solo aparece cuando hay algo
// que contar. El tipo sigue la prioridad error > ventana vencida > sin conexión > pendientes.
export function syncAttention(status: SyncStatus): SyncAttention | null {
  const parts: string[] = [];
  if (!status.isWithinOfflineWindow) parts.push('inicia sesión con conexión');
  if (!status.isOnline) parts.push('sin conexión');
  if (status.errorCount > 0) {
    parts.push(
      counted(status.errorCount, 'registro con error', 'registros con error'),
    );
  }
  if (status.pendingCount > 0) {
    parts.push(counted(status.pendingCount, 'pendiente', 'pendientes'));
  }
  if (!parts.length) return null;
  const label = parts.join(', ');
  return {
    kind:
      status.errorCount > 0
        ? 'error'
        : !status.isWithinOfflineWindow
          ? 'expired'
          : !status.isOnline
            ? 'offline'
            : 'pending',
    count: status.errorCount + status.pendingCount,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}
