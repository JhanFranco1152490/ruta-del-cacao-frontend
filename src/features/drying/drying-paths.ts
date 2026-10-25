export const DRYING_PATH = '/secado';

// La pantalla de campo de la bitácora. Ruta fija con parámetros: una sola página guardada sirve para
// registrar y corregir, también sin conexión.
export const LOG_PATH = `${DRYING_PATH}/bitacora`;

// Registrar la bitácora de un día del lote.
export const logPath = (lotId: string) =>
  `${LOG_PATH}?${new URLSearchParams({ lote: lotId })}`;

// Corregir en línea una bitácora que ya está en el servidor.
export const logCorrectionPath = (lotId: string, logId: string) =>
  `${LOG_PATH}?${new URLSearchParams({ lote: lotId, id: logId })}`;

// Corregir una bitácora que el servidor rechazó y sigue en la cola del dispositivo.
export const queuedLogCorrectionPath = (lotId: string, logId: string) =>
  `${LOG_PATH}?${new URLSearchParams({ lote: lotId, pendiente: logId })}`;
