import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

// `request` se envía tal cual, con el id del dispositivo. El registro se crea en la dirección de su
// lote (`lotId`). `label` lo nombra en la bandeja, donde el proceso del lote no está cargado.
export type RecordPayload<TRequest> = {
  lotId: string;
  request: TRequest;
  label: string;
};

export type QueuedRecord<TRequest> = {
  id: string;
  lotId: string;
  request: TRequest;
  label: string;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  errorData?: unknown;
};

// Los registros de campo de un lote (un volteo, una bitácora) se guardan primero en el dispositivo,
// con o sin conexión, y la cola los envía. Cada tipo de registro tiene su recurso y su prefijo de
// id: la cola guarda todo por id sin distinguir el recurso.
export function createRecordQueue<TRequest extends { id: string }>({
  resource,
  idPrefix,
}: {
  resource: string;
  idPrefix: string;
}) {
  type Payload = RecordPayload<TRequest>;
  type Queued = QueuedRecord<TRequest>;

  const queueId = (recordId: string) => `${idPrefix}:${recordId}`;

  function queuedOf(item: QueueItem): Queued {
    // La cola de este recurso solo la escribe su módulo, siempre con esta forma.
    const { lotId, request, label } = item.payload as Payload;
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

  // No espera a otro registro de la cola: el proceso del lote se inicia solo en línea, así que ya
  // está en el servidor.
  const enqueueRecord = (userId: string, payload: Payload) =>
    enqueue(userId, {
      id: queueId(payload.request.id),
      resource,
      operation: 'create',
      payload,
    });

  async function get(userId: string, recordId: string): Promise<Queued | null> {
    const item = await getOfflineDb(userId).queue.get(queueId(recordId));
    if (!item || item.resource !== resource) return null;
    return queuedOf(item);
  }

  // Todos los registros que siguen en este dispositivo, pendientes o con error.
  async function list(userId: string): Promise<Queued[]> {
    const items = await getOfflineDb(userId)
      .queue.where('resource')
      .equals(resource)
      .toArray();
    return items.map(queuedOf);
  }

  // Corregir el que el servidor rechazó: reemplaza lo capturado y lo devuelve a pendiente.
  const resubmitRecord = (userId: string, payload: Payload) =>
    resubmit(userId, queueId(payload.request.id), payload);

  return {
    resource,
    queueId,
    queuedOf,
    enqueue: enqueueRecord,
    get,
    list,
    resubmit: resubmitRecord,
  };
}

export type RecordQueue<TRequest extends { id: string }> = ReturnType<
  typeof createRecordQueue<TRequest>
>;

// Los registros de un lote que van camino al servidor. Uno rechazado no cuenta: espera en la
// bandeja a que lo corrijan o lo descarten.
export const pendingRecordsOf = <TRequest>(
  queued: readonly QueuedRecord<TRequest>[],
  lotId: string,
) =>
  queued.filter(
    (record) => record.lotId === lotId && record.status !== 'error',
  );
