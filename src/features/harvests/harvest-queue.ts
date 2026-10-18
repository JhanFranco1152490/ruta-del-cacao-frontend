import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import {
  characterizationQueueId,
  harvestQueueId,
} from '@/lib/offline/queue-ids';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

import type { HarvestLotSource } from './harvest-lot-source';
import type { HarvestCreateRequest } from './harvest-requests';

export const HARVEST_RESOURCE = 'harvests';

// La cola guarda cada registro por su id sin distinguir el recurso: la cosecha lleva un prefijo,
// como la ficha y la realización (ver `harvestQueueId`).
export { harvestQueueId };

// `request` se envía tal cual, con el id del dispositivo. `label` nombra la cosecha en la bandeja
// ("P05 · Lote del río · 14 oct."): ahí la parcela no está cargada.
//
// `lotSource` es lo que hace falta para conformar su lote sin conexión mientras la cosecha sigue en
// el teléfono: con ella se nombra y se resume. Las guardadas por una versión anterior no la traen.
export type HarvestPayload = {
  request: HarvestCreateRequest & { id: string };
  label: string;
  lotSource?: HarvestLotSource;
};

export type QueuedHarvest = {
  id: string;
  request: HarvestPayload['request'];
  label: string;
  lotSource?: HarvestLotSource;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  errorData?: unknown;
};

export function queuedHarvestOf(item: QueueItem): QueuedHarvest {
  // La cola de cosechas solo la escribe este módulo, siempre con esta forma.
  const { request, label, lotSource } = item.payload as HarvestPayload;
  return {
    id: request.id,
    request,
    label,
    lotSource,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    errorData: item.errorData,
  };
}

// Toda cosecha se guarda primero en el dispositivo, con o sin conexión. Su padre es la ficha de la
// parcela: si la parcela o su ficha se crearon sin conexión y siguen en la cola, la cosecha espera
// a que lleguen (enviada antes, el servidor la rechazaría). Si la ficha no está en la cola, la
// cosecha sale de una.
export const enqueueHarvest = (userId: string, payload: HarvestPayload) =>
  enqueue(userId, {
    id: harvestQueueId(payload.request.id),
    resource: HARVEST_RESOURCE,
    operation: 'create',
    parentId: characterizationQueueId(payload.request.plot_id),
    payload,
  });

export async function getQueuedHarvest(
  userId: string,
  harvestId: string,
): Promise<QueuedHarvest | null> {
  const item = await getOfflineDb(userId).queue.get(harvestQueueId(harvestId));
  if (!item || item.resource !== HARVEST_RESOURCE) return null;
  return queuedHarvestOf(item);
}

// Todas las cosechas que siguen en este dispositivo, pendientes o con error.
export async function listQueuedHarvests(
  userId: string,
): Promise<QueuedHarvest[]> {
  const items = await getOfflineDb(userId)
    .queue.where('resource')
    .equals(HARVEST_RESOURCE)
    .toArray();
  return items.map(queuedHarvestOf);
}

// Corregir la que el servidor rechazó: reemplaza lo capturado y la devuelve a pendiente.
export const resubmitHarvest = (userId: string, payload: HarvestPayload) =>
  resubmit(userId, harvestQueueId(payload.request.id), payload);
