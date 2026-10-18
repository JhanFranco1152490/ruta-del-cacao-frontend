import { getOfflineDb, type QueueItem } from '@/lib/offline/db';
import { enqueue } from '@/lib/offline/sync-queue';

import { controlQueueId } from './control-queue';
import { monitoringQueueId } from './monitoring-queue';

export const EVIDENCE_RESOURCE = 'evidence';

export const evidenceQueueId = (evidenceId: string) => `evidence:${evidenceId}`;

// Una foto que espera en el dispositivo. `id` lo genera el dispositivo al elegirla: reenviarla no la
// duplica. `kind` dice qué respalda (el resultado de un monitoreo o un control), y con eso a qué
// registro de la cola espera. `label` la nombra en la bandeja.
export type EvidencePayload = {
  id: string;
  activityId: string;
  kind: 'monitoring' | 'control';
  blob: Blob;
  fileName: string;
  capturedAt: string;
  label: string;
};

export const evidencePayloadOf = (item: QueueItem) =>
  // La cola de fotos solo la escribe este módulo, siempre con esta forma.
  item.payload as EvidencePayload;

// La foto espera a lo que respalda si todavía está en la cola: el servidor no acepta fotos de un
// monitoreo o un control que no se ha registrado como realizado. Si ya llegó, el padre no está en la
// cola y la foto sale de inmediato.
const parentOf = ({ kind, activityId }: EvidencePayload) =>
  kind === 'monitoring'
    ? monitoringQueueId(activityId)
    : controlQueueId(activityId);

export const enqueueEvidence = (userId: string, payload: EvidencePayload) =>
  enqueue(userId, {
    id: evidenceQueueId(payload.id),
    resource: EVIDENCE_RESOURCE,
    operation: 'create',
    parentId: parentOf(payload),
    payload,
  });

// Las fotos de una actividad que siguen en este dispositivo, esperando conexión o rechazadas.
export async function listQueuedEvidence(
  userId: string,
  activityId: string,
): Promise<(EvidencePayload & { status: QueueItem['status'] })[]> {
  const items = await getOfflineDb(userId)
    .queue.where('resource')
    .equals(EVIDENCE_RESOURCE)
    .toArray();
  return items
    .map((item) => ({ ...evidencePayloadOf(item), status: item.status }))
    .filter((photo) => photo.activityId === activityId);
}
