import type { components } from '@/lib/api/schema';
import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

type CompletionRequest = components['schemas']['CompletionRequest'];

export const COMPLETION_RESOURCE = 'agricultural-activity-completions';

// La cola guarda cada registro por su id sin distinguir el recurso: la realización lleva un
// prefijo para no pisar otro registro que use el id de la actividad.
const QUEUE_ID_PREFIX = 'activity-completion:';

export const completionQueueId = (activityId: string) =>
  `${QUEUE_ID_PREFIX}${activityId}`;

// `request` se envía tal cual. `label` nombra la labor en la bandeja ("Fertilización · P-03"): ahí
// la actividad no está cargada, y puede que ya ni exista.
export type CompletionPayload = {
  request: CompletionRequest;
  label: string;
};

export type QueuedCompletion = {
  activityId: string;
  request: CompletionRequest;
  label: string;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  errorData?: unknown;
};

export function queuedCompletionOf(item: QueueItem): QueuedCompletion {
  // La cola de realizaciones solo la escribe este módulo, siempre con esta forma.
  const { request, label } = item.payload as CompletionPayload;
  return {
    // El padre de toda realización encolada es su actividad.
    activityId: item.parentId!,
    request,
    label,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    errorData: item.errorData,
  };
}

// Toda realización se guarda primero en el dispositivo, con o sin conexión. Con una de esa
// actividad ya esperando se rechaza: una realización no se registra dos veces, y lo que falló se
// corrige sobre el pendiente.
export const enqueueCompletion = (
  userId: string,
  activityId: string,
  payload: CompletionPayload,
) =>
  enqueue(
    userId,
    {
      id: completionQueueId(activityId),
      resource: COMPLETION_RESOURCE,
      operation: 'update',
      parentId: activityId,
      payload,
    },
    { rejectExisting: true },
  );

export async function getQueuedCompletion(
  userId: string,
  activityId: string,
): Promise<QueuedCompletion | null> {
  const item = await getOfflineDb(userId).queue.get(
    completionQueueId(activityId),
  );
  if (!item || item.resource !== COMPLETION_RESOURCE) return null;
  return queuedCompletionOf(item);
}

// Todas las realizaciones que siguen en este dispositivo, pendientes o con error.
export async function listQueuedCompletions(
  userId: string,
): Promise<QueuedCompletion[]> {
  const items = await getOfflineDb(userId)
    .queue.where('resource')
    .equals(COMPLETION_RESOURCE)
    .toArray();
  return items.map(queuedCompletionOf);
}

// Corregir la que el servidor rechazó: reemplaza lo capturado y la devuelve a pendiente.
export const resubmitCompletion = (
  userId: string,
  activityId: string,
  payload: CompletionPayload,
) => resubmit(userId, completionQueueId(activityId), payload);
