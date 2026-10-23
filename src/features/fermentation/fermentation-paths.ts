export const FERMENTATION_PATH = '/fermentacion';

// La pantalla de campo del volteo. Ruta fija con parámetros: una sola página guardada sirve para
// registrar y corregir, también sin conexión.
export const TURN_PATH = `${FERMENTATION_PATH}/volteo`;

// Registrar un volteo del lote.
export const turnPath = (lotId: string) =>
  `${TURN_PATH}?${new URLSearchParams({ lote: lotId })}`;

// Corregir en línea un volteo que ya está en el servidor.
export const turnCorrectionPath = (lotId: string, turnId: string) =>
  `${TURN_PATH}?${new URLSearchParams({ lote: lotId, id: turnId })}`;

// Corregir un volteo que el servidor rechazó y sigue en la cola del dispositivo.
export const queuedTurnCorrectionPath = (lotId: string, turnId: string) =>
  `${TURN_PATH}?${new URLSearchParams({ lote: lotId, pendiente: turnId })}`;
