import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

import type { MonitoringResultRequest } from './monitoring-request';

export const MONITORING_RESOURCE = 'monitoring-results';

// La cola guarda cada registro por su id sin distinguir el recurso: el resultado lleva un prefijo
// para no pisar otro registro que use el id de la actividad (como su realización).
const QUEUE_ID_PREFIX = 'monitoring-result:';

export const monitoringQueueId = (activityId: string) =>
  `${QUEUE_ID_PREFIX}${activityId}`;

// `request` se envía tal cual. `label` nombra el monitoreo en la bandeja ("P-03 · 19 de octubre"):
// ahí la actividad no está cargada, y puede que ya ni exista.
export type MonitoringPayload = {
  request: MonitoringResultRequest;
  label: string;
};

export type QueuedMonitoring = {
  activityId: string;
  request: MonitoringResultRequest;
  label: string;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  errorData?: unknown;
};

export function queuedMonitoringOf(item: QueueItem): QueuedMonitoring {
  // La cola de resultados solo la escribe este módulo, siempre con esta forma.
  const { request, label } = item.payload as MonitoringPayload;
  return {
    // El padre de todo resultado encolado es su monitoreo.
    activityId: item.parentId!,
    request,
    label,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    errorData: item.errorData,
  };
}

// Todo resultado se guarda primero en el dispositivo, con o sin conexión. Con uno de ese monitoreo
// ya esperando se rechaza: un monitoreo no se registra dos veces, y lo que falló se corrige sobre
// el pendiente.
export const enqueueMonitoring = (
  userId: string,
  activityId: string,
  payload: MonitoringPayload,
) =>
  enqueue(
    userId,
    {
      id: monitoringQueueId(activityId),
      resource: MONITORING_RESOURCE,
      operation: 'update',
      parentId: activityId,
      payload,
    },
    { rejectExisting: true },
  );

export async function getQueuedMonitoring(
  userId: string,
  activityId: string,
): Promise<QueuedMonitoring | null> {
  const item = await getOfflineDb(userId).queue.get(
    monitoringQueueId(activityId),
  );
  if (!item || item.resource !== MONITORING_RESOURCE) return null;
  return queuedMonitoringOf(item);
}

// Corregir el que el servidor rechazó: reemplaza lo capturado y lo devuelve a pendiente.
export const resubmitMonitoring = (
  userId: string,
  activityId: string,
  payload: MonitoringPayload,
) => resubmit(userId, monitoringQueueId(activityId), payload);
