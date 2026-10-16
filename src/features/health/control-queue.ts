import type { QueueItem } from '@/lib/offline/db';
import { enqueue } from '@/lib/offline/sync-queue';

import type { DetectionControlRequest } from './control-schema';

export const CONTROL_RESOURCE = 'phytosanitary-controls';

// La cola guarda cada registro por su id sin distinguir el recurso: el control lleva un prefijo
// para no pisar otro registro que use el mismo id.
export const controlQueueId = (controlId: string) =>
  `phytosanitary-control:${controlId}`;

// `request` se envía tal cual. `label` nombra el control en la bandeja ("Monilia · P-03").
export type ControlPayload = {
  request: DetectionControlRequest;
  label: string;
};

export const controlPayloadOf = (item: QueueItem) =>
  // La cola de controles solo la escribe este módulo, siempre con esta forma.
  item.payload as ControlPayload;

// Todo control se guarda primero en el dispositivo, con o sin conexión. Su padre es la detección,
// en cuya dirección se crea. El `id` lo generó el formulario al abrirse: guardarlo dos veces no
// crea dos controles.
export const enqueueControl = (
  userId: string,
  detectionId: string,
  payload: ControlPayload,
) =>
  enqueue(userId, {
    id: controlQueueId(payload.request.id),
    resource: CONTROL_RESOURCE,
    operation: 'create',
    parentId: detectionId,
    payload,
  });
