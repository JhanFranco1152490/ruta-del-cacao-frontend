import {
  QueueItemBusyError,
  QueueItemHasDependentsError,
  QueueItemMissingError,
} from '@/lib/offline/sync-queue';

export function queueErrorMessage(error: unknown, fallback: string) {
  if (error instanceof QueueItemBusyError) {
    return 'La finca se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Esta finca ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  if (error instanceof QueueItemHasDependentsError) {
    return 'No se puede descartar: hay registros pendientes que dependen de esta finca.';
  }
  return fallback;
}
