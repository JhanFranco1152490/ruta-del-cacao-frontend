import type { QueuedRecordState } from '@/hooks/use-queued-record-state';

// Lo que le pasó a un registro guardado en el dispositivo, escrito para seguir a su nombre
// ("P1 ya quedó guardada en el servidor."). Lo comparten los paneles de "guardado" de cada dominio.
export function describeQueuedRecord(
  state: QueuedRecordState,
  isOnline: boolean,
): string {
  switch (state.status) {
    case 'synced':
      return 'ya quedó guardada en el servidor.';
    case 'error':
      return `quedó en este dispositivo, pero el servidor no la aceptó${
        state.errorMessage ? `: ${state.errorMessage}` : '.'
      } Corrígela para reenviarla.`;
    default:
      return isOnline
        ? 'quedó guardada en este dispositivo y se está enviando al servidor.'
        : 'quedó guardada en este dispositivo y se enviará al servidor cuando haya conexión.';
  }
}
