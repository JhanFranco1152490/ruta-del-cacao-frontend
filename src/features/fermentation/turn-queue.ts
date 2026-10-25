import type { components } from '@/lib/api/schema';
import { formatShortDateTime } from '@/lib/format/dates';
import {
  createRecordQueue,
  pendingRecordsOf,
  type QueuedRecord,
  type RecordPayload,
} from '@/lib/offline/record-queue';

export type TurnRequest =
  components['schemas']['FermentationTurnCreateRequest'];

// El volteo lleva un prefijo en la cola, que guarda todo por id sin distinguir el recurso. Todo
// volteo se guarda primero en el dispositivo; la fermentación se inicia solo en línea, así que no
// hay nada que esperar.
export const turnQueue = createRecordQueue<TurnRequest>({
  resource: 'fermentation-turns',
  idPrefix: 'fermentation-turn',
});

export const TURN_RESOURCE = turnQueue.resource;
export const turnQueueId = turnQueue.queueId;

// El volteo se registra en la dirección de su lote.
export type TurnPayload = RecordPayload<TurnRequest>;
export type QueuedTurn = QueuedRecord<TurnRequest>;

// «000123-F02-P05-261014-1 · volteo 3 · 17 oct. 08:00».
export const turnQueueLabel = (
  lotCode: string,
  number: number,
  turnedAt: string,
) => `${lotCode} · volteo ${number} · ${formatShortDateTime(turnedAt)}`;

export const queuedTurnOf = turnQueue.queuedOf;
export const enqueueTurn = turnQueue.enqueue;
export const getQueuedTurn = turnQueue.get;

// Todos los volteos que siguen en este dispositivo, pendientes o con error.
export const listQueuedTurns = turnQueue.list;

// Corregir el que el servidor rechazó: reemplaza lo capturado y lo devuelve a pendiente.
export const resubmitTurn = turnQueue.resubmit;

// Los volteos de un lote que van camino al servidor.
export const pendingTurnsOf = (queued: readonly QueuedTurn[], lotId: string) =>
  pendingRecordsOf(queued, lotId);
