import type { components } from '@/lib/api/schema';
import { formatShortDayMonth } from '@/lib/format/dates';
import {
  createRecordQueue,
  pendingRecordsOf,
  type QueuedRecord,
  type RecordPayload,
} from '@/lib/offline/record-queue';

export type LogRequest = components['schemas']['DryingLogCreateRequest'];

// La bitácora lleva un prefijo en la cola, que guarda todo por id sin distinguir el recurso. Toda
// bitácora se guarda primero en el dispositivo; el secado se inicia solo en línea, así que no hay
// nada que esperar.
export const logQueue = createRecordQueue<LogRequest>({
  resource: 'drying-logs',
  idPrefix: 'drying-log',
});

export const LOG_RESOURCE = logQueue.resource;
export const logQueueId = logQueue.queueId;

// La bitácora se registra en la dirección de su lote.
export type LogPayload = RecordPayload<LogRequest>;
export type QueuedLog = QueuedRecord<LogRequest>;

// «000123-F02-P05-261014-1 · bitácora del día 3 · 17 oct».
export const logQueueLabel = (
  lotCode: string,
  dayNumber: number,
  measuredAt: string,
) =>
  `${lotCode} · bitácora del día ${dayNumber} · ${formatShortDayMonth(measuredAt)}`;

export const queuedLogOf = logQueue.queuedOf;
export const enqueueLog = logQueue.enqueue;
export const getQueuedLog = logQueue.get;

// Todas las bitácoras que siguen en este dispositivo, pendientes o con error.
export const listQueuedLogs = logQueue.list;

// Corregir la que el servidor rechazó: reemplaza lo capturado y la devuelve a pendiente.
export const resubmitLog = logQueue.resubmit;

// Las bitácoras de un lote que van camino al servidor.
export const pendingLogsOf = (queued: readonly QueuedLog[], lotId: string) =>
  pendingRecordsOf(queued, lotId);
