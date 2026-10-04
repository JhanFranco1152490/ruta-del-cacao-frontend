import { isApiError } from '@/lib/api/errors';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { patchFarm, postFarm } from './api';
import {
  createToUpdate,
  FARM_RESOURCE,
  type FarmCreatePayload,
  type FarmUpdatePayload,
} from './farm-queue';

export const FARM_DELETED_CODE = 'farm_deleted';
export const FARM_DELETED_MESSAGE =
  'Esta finca fue eliminada. Descarta esta edición.';

export const farmSyncAdapter: SyncAdapter = {
  resource: FARM_RESOURCE,

  async send(item) {
    if (item.operation === 'create') {
      await postFarm({
        ...(item.payload as FarmCreatePayload),
        // La hora en que se guardó en el dispositivo; informativa para el servidor.
        captured_at: new Date(item.createdAt).toISOString(),
      });
    } else {
      await patchFarm(item.id, item.payload as FarmUpdatePayload);
    }
  },

  // El alta llegó al servidor pero se perdió la respuesta, y luego se editó en el dispositivo:
  // el reenvío choca con la finca ya creada (`farm_id_conflict`). La API solo incluye `current`
  // si esa finca es del mismo productor; sin `current` es un choque real y va a la bandeja.
  recover(item, error) {
    if (
      item.operation !== 'create' ||
      !isApiError(error) ||
      error.code !== 'farm_id_conflict' ||
      !error.body.current
    ) {
      return null;
    }
    return {
      operation: 'update',
      payload: createToUpdate(item.payload as FarmCreatePayload),
    };
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta. El resto
  // (nombre duplicado, versión obsoleta, validación, sin permiso, finca inexistente) no mejora
  // reintentando: va a la bandeja con el mensaje del servidor para que la persona lo revise.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    // Solo una edición puede encontrar su finca inexistente (un alta nunca responde 404): la
    // eliminaron mientras la edición esperaba en el dispositivo.
    if (error.status === 404) {
      return { code: FARM_DELETED_CODE, message: FARM_DELETED_MESSAGE };
    }
    return { code: error.code, message: error.message };
  },
};
