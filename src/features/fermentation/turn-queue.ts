import type { components } from '@/lib/api/schema';
import { formatShortDateTime } from '@/lib/format/dates';
import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

export type TurnRequest =
  components['schemas']['FermentationTurnCreateRequest'];

export const TURN_RESOURCE = 'fermentation-turns';

// La cola guarda cada registro por su id sin distinguir el recurso: el volteo lleva un prefijo.
export const turnQueueId = (turnId: string) => `fermentation-turn:${turnId}`;

// `request` se envía tal cual, con el id del dispositivo. El volteo se registra en la dirección de su
// lote (`lotId`). `label` lo nombra en la bandeja, donde la fermentación no está cargada.
export type TurnPayload = {
  lotId: string;
  request: TurnRequest;
  label: string;
};

export type QueuedTurn = {
  id: string;
  lotId: string;
  request: TurnRequest;
  label: string;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  errorData?: unknown;
};

// «000123-F02-P05-261014-1 · volteo 3 · 17 oct. 08:00».
export const turnQueueLabel = (
  lotCode: string,
  number: number,
  turnedAt: string,
) => `${lotCode} · volteo ${number} · ${formatShortDateTime(turnedAt)}`;

export function queuedTurnOf(item: QueueItem): QueuedTurn {
  // La cola de volteos solo la escribe este módulo, siempre con esta forma.
  const { lotId, request, label } = item.payload as TurnPayload;
  return {
    id: request.id,
    lotId,
    request,
    label,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    errorData: item.errorData,
  };
}

// Todo volteo se guarda primero en el dispositivo, con o sin conexión. No espera a otro registro de
// la cola: la fermentación se inicia solo en línea, así que ya está en el servidor.
export const enqueueTurn = (userId: string, payload: TurnPayload) =>
  enqueue(userId, {
    id: turnQueueId(payload.request.id),
    resource: TURN_RESOURCE,
    operation: 'create',
    payload,
  });

export async function getQueuedTurn(
  userId: string,
  turnId: string,
): Promise<QueuedTurn | null> {
  const item = await getOfflineDb(userId).queue.get(turnQueueId(turnId));
  if (!item || item.resource !== TURN_RESOURCE) return null;
  return queuedTurnOf(item);
}

// Todos los volteos que siguen en este dispositivo, pendientes o con error.
export async function listQueuedTurns(userId: string): Promise<QueuedTurn[]> {
  const items = await getOfflineDb(userId)
    .queue.where('resource')
    .equals(TURN_RESOURCE)
    .toArray();
  return items.map(queuedTurnOf);
}

// Corregir el que el servidor rechazó: reemplaza lo capturado y lo devuelve a pendiente.
export const resubmitTurn = (userId: string, payload: TurnPayload) =>
  resubmit(userId, turnQueueId(payload.request.id), payload);

// Los volteos de un lote que van camino al servidor. Uno rechazado no cuenta: espera en la bandeja
// a que lo corrijan o lo descarten.
export const pendingTurnsOf = (queued: readonly QueuedTurn[], lotId: string) =>
  queued.filter((turn) => turn.lotId === lotId && turn.status !== 'error');
