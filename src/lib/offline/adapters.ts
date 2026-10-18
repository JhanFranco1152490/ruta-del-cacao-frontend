import type { QueueItem, QueueOperation } from './db';

export interface SyncConflict {
  code: string;
  message: string;
  data?: unknown;
}

// Reintentar el mismo registro como otra operación. Caso típico: un alta que sí llegó al
// servidor (se perdió la respuesta) y luego se editó en el dispositivo; reenviarla como alta
// choca con la que ya existe, pero como edición se aplica.
export interface SyncRecovery {
  operation: QueueOperation;
  payload: unknown;
}

// El código que el servidor le dio a un registro creado en el dispositivo (una finca, una parcela
// o un lote), para avisarle a la persona cuál quedó.
export interface AssignedCode {
  kind: 'farm' | 'plot' | 'lot';
  code: string;
  name?: string | null;
}

// Cada dominio (fincas, parcelas...) implementa uno y lo registra con `registerAdapter`.
// `payload` llega tal como lo guardó `enqueue`: cada adapter conoce y valida la forma que le
// corresponde a su propio recurso.
export interface SyncAdapter {
  resource: string;
  // Devuelve lo que respondió el servidor, para quien escucha los envíos (`onItemSynced`).
  send(item: QueueItem): Promise<unknown>;
  // El conflicto que va a la bandeja de error, o null si conviene reintentar (error de red
  // o del servidor).
  parseConflict(error: unknown): SyncConflict | null;
  // Opcional: antes de clasificar el error, el adapter puede convertir el registro en otra
  // operación para reintentarlo. El motor lo reintenta una sola vez por pasada.
  recover?(item: QueueItem, error: unknown): SyncRecovery | null;
  // Las consultas que cambian cuando el registro llega al servidor: se vuelven a pedir aunque
  // la pantalla que lo guardó ya no esté abierta.
  refreshAfterSync?(item: QueueItem): readonly (readonly unknown[])[];
  // Opcional: el código que el servidor asignó al registro, si es de los que lo reciben al
  // llegar. Lee `response`, lo que devolvió `send`.
  assignedCode?(item: QueueItem, response: unknown): AssignedCode | null;
}

// Respuestas que pueden salir bien más adelante sin que nadie corrija nada: la sesión se
// renueva (401), el límite de solicitudes pasa (429) o el servidor se recupera (5xx). Con ellas
// el registro se reintenta en vez de ir a la bandeja.
export function isRetryableStatus(status: number) {
  return status === 401 || status === 429 || status >= 500;
}
