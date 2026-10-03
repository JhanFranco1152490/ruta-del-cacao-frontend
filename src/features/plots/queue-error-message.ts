import {
  QueueItemBusyError,
  QueueItemExistsError,
  QueueItemMissingError,
} from '@/lib/offline/sync-queue';

export function plotQueueErrorMessage(error: unknown, fallback: string) {
  if (error instanceof QueueItemBusyError) {
    return 'La parcela se está enviando en este momento. Espera unos segundos e inténtalo de nuevo.';
  }
  if (error instanceof QueueItemMissingError) {
    return 'Esta parcela ya no está pendiente en este dispositivo: se sincronizó o se descartó.';
  }
  if (error instanceof QueueItemExistsError) {
    return 'Esta parcela ya tiene cambios guardados en este dispositivo que aún no se envían. Vuelve a abrirla desde la finca para editarlos.';
  }
  return fallback;
}
