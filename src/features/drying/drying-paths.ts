import { LOG_PATH } from '@/lib/paths/drying';

export { DRYING_PATH, LOG_PATH, logPath } from '@/lib/paths/drying';

// Corregir en línea una bitácora que ya está en el servidor.
export const logCorrectionPath = (lotId: string, logId: string) =>
  `${LOG_PATH}?${new URLSearchParams({ lote: lotId, id: logId })}`;

// Corregir una bitácora que el servidor rechazó y sigue en la cola del dispositivo.
export const queuedLogCorrectionPath = (lotId: string, logId: string) =>
  `${LOG_PATH}?${new URLSearchParams({ lote: lotId, pendiente: logId })}`;
