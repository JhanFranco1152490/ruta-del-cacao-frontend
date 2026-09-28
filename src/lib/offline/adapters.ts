import type { QueueItem } from './db';

export interface SyncConflict {
  code: string;
  message: string;
}

// Cada dominio (fincas, parcelas...) implementa uno y lo registra con `registerAdapter`.
// `payload` llega tal como lo guardó `enqueue`: cada adapter conoce y valida la forma que le
// corresponde a su propio recurso.
export interface SyncAdapter {
  resource: string;
  send(item: QueueItem): Promise<void>;
  // El conflicto que va a la bandeja de error, o null si conviene reintentar (error de red
  // o del servidor).
  parseConflict(error: unknown): SyncConflict | null;
}
