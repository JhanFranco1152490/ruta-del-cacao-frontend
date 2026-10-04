import {
  getOfflineDb,
  type QueueItem,
  type QueueStatus,
} from '@/lib/offline/db';
import type { components } from '@/lib/api/schema';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

import type { CharacterizationFormFields } from './schemas';

export const CHARACTERIZATION_RESOURCE = 'plot-characterizations';

// La cola guarda cada registro por su id sin distinguir el recurso, y el de una parcela ya usa el
// id de la parcela: la ficha lleva un prefijo para no pisarlo. La parcela sigue siendo su padre.
const QUEUE_ID_PREFIX = 'plot-characterization:';

export const characterizationQueueId = (plotId: string) =>
  `${QUEUE_ID_PREFIX}${plotId}`;

// Lo que se envía tal cual en el PUT: la ficha completa y la versión que se leyó (null si la
// parcela no tenía ficha).
export type CharacterizationPayload = CharacterizationFormFields & {
  expected_version: number | null;
  captured_at: string;
};

export type QueuedCharacterization = {
  plotId: string;
  fields: CharacterizationFormFields;
  expectedVersion: number | null;
  status: QueueStatus;
  errorCode?: string;
  errorMessage?: string;
  errorData?: unknown;
};

const toPayload = (
  fields: CharacterizationFormFields,
  expectedVersion: number | null,
  capturedAt: string,
): CharacterizationPayload =>
  // `satisfies`: el contenido de la cola se envía tal cual en el PUT.
  ({
    ...fields,
    expected_version: expectedVersion,
    captured_at: capturedAt,
  }) satisfies components['schemas']['PlotCharacterizationWriteRequest'];

function toQueued(item: QueueItem): QueuedCharacterization {
  // La cola de fichas solo la escribe este módulo, siempre con esta forma.
  const payload = item.payload as CharacterizationPayload;
  return {
    // El padre de toda ficha encolada es su parcela.
    plotId: item.parentId!,
    fields: {
      varieties: payload.varieties,
      planting_date: payload.planting_date,
      stage: payload.stage,
      management_system: payload.management_system,
      shade_type: payload.shade_type,
    },
    expectedVersion: payload.expected_version,
    status: item.status,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    errorData: item.errorData,
  };
}

// Toda ficha se guarda primero en el dispositivo, con o sin conexión. Si su parcela todavía está
// en la cola, la ficha espera a que sincronice. Con una ficha de esa parcela ya esperando se
// rechaza: el cambio nuevo se aplica corrigiendo el pendiente, no con otro registro.
export const enqueueCharacterization = (
  userId: string,
  plotId: string,
  fields: CharacterizationFormFields,
  expectedVersion: number | null,
  capturedAt = new Date().toISOString(),
) =>
  enqueue(
    userId,
    {
      id: characterizationQueueId(plotId),
      resource: CHARACTERIZATION_RESOURCE,
      operation: 'update',
      parentId: plotId,
      payload: toPayload(fields, expectedVersion, capturedAt),
    },
    { rejectExisting: true },
  );

export async function getQueuedCharacterization(
  userId: string,
  plotId: string,
): Promise<QueuedCharacterization | null> {
  const item = await getOfflineDb(userId).queue.get(
    characterizationQueueId(plotId),
  );
  if (!item || item.resource !== CHARACTERIZATION_RESOURCE) return null;
  return toQueued(item);
}

// Las fichas que siguen en este dispositivo (pendientes o con error) para estas parcelas.
export async function listQueuedCharacterizations(
  userId: string,
  plotIds: readonly string[],
): Promise<QueuedCharacterization[]> {
  if (plotIds.length === 0) return [];
  const items = await getOfflineDb(userId)
    .queue.where('parentId')
    .anyOf([...plotIds])
    .filter((item) => item.resource === CHARACTERIZATION_RESOURCE)
    .toArray();
  return items.map(toQueued);
}

// Corregir lo que sigue en la cola. La versión cambia solo cuando la persona revisó la ficha
// vigente en el servidor después de un `stale_version`; si no, se conserva la que se leyó.
export const resubmitCharacterization = (
  userId: string,
  queued: QueuedCharacterization,
  fields: CharacterizationFormFields,
  expectedVersion = queued.expectedVersion,
  capturedAt = new Date().toISOString(),
) =>
  resubmit(
    userId,
    characterizationQueueId(queued.plotId),
    toPayload(fields, expectedVersion, capturedAt),
  );
