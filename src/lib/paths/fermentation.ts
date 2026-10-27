export const FERMENTATION_PATH = '/fermentacion';

// La pantalla de campo del volteo. Ruta fija con parámetros: una sola página guardada sirve para
// registrar y corregir, también sin conexión.
export const TURN_PATH = `${FERMENTATION_PATH}/volteo`;

// Registrar un volteo del lote.
export const turnPath = (lotId: string) =>
  `${TURN_PATH}?${new URLSearchParams({ lote: lotId })}`;
