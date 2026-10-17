import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import { harvestQueueId } from '@/lib/offline/queue-ids';
import { enqueue } from '@/lib/offline/sync-queue';

export const LOT_RESOURCE = 'lots';

// La cola guarda cada registro por su id sin distinguir el recurso: el lote lleva un prefijo.
const QUEUE_ID_PREFIX = 'lot:';

export const lotQueueId = (lotId: string) => `${QUEUE_ID_PREFIX}${lotId}`;

// `request` se envía tal cual, con el id del dispositivo. `label` nombra el lote en la bandeja
// ("Lote de P05 · Lote del río · 14 oct."): ahí no tiene código todavía.
export type LotPayload = {
  request: { id: string; harvest_id: string };
  label: string;
};

export type QueuedLot = {
  id: string;
  harvestId: string;
  label: string;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
};

export function queuedLotOf(item: QueueItem): QueuedLot {
  // La cola de lotes solo la escribe este módulo, siempre con esta forma.
  const { request, label } = item.payload as LotPayload;
  return {
    id: request.id,
    harvestId: request.harvest_id,
    label,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
  };
}

// El lote se conforma también sin conexión: nace en el dispositivo con su id y el servidor le asigna
// el código al recibirlo, como a una finca o una parcela. Su padre es la cosecha: si la cosecha
// sigue en la cola, el lote espera a que llegue (enviado antes, el servidor no la encontraría). Si
// la cosecha ya está en el servidor, el lote sale de una.
export const enqueueLot = (userId: string, payload: LotPayload) =>
  enqueue(userId, {
    id: lotQueueId(payload.request.id),
    resource: LOT_RESOURCE,
    operation: 'create',
    parentId: harvestQueueId(payload.request.harvest_id),
    payload,
  });

// Todos los lotes que siguen en este dispositivo, pendientes o con error.
export async function listQueuedLots(userId: string): Promise<QueuedLot[]> {
  const items = await getOfflineDb(userId)
    .queue.where('resource')
    .equals(LOT_RESOURCE)
    .toArray();
  return items.map(queuedLotOf);
}
