import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { CONTROL_RESOURCE, controlPayloadOf } from './control-queue';
import { postDetectionControl } from './monitoring-api';

export const DETECTION_DELETED_CODE = 'detection_deleted';

export const controlSyncAdapter: SyncAdapter = {
  resource: CONTROL_RESOURCE,

  // Al llegar al servidor aparece en el calendario, uno hecho descuenta sus insumos de la finca, y
  // la detección deja de estar sin control.
  refreshAfterSync: () => [
    queryKeys.agriculturalActivities.all(),
    queryKeys.inputStocks.all(),
    queryKeys.health.all(),
  ],

  // El padre del registro es la detección, y el control se crea en su dirección.
  async send(item) {
    await postDetectionControl(item.parentId!, controlPayloadOf(item).request);
  },

  // Sin respuesta (sin red) o con una que puede cambiar sola, se reintenta. El resto va a la
  // bandeja con el motivo del servidor: el control se descarta y se vuelve a crear desde la
  // detección, que sigue ofreciéndolo.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return {
        code: DETECTION_DELETED_CODE,
        message: 'Esta detección ya no existe.',
      };
    }
    return { code: error.code, message: error.message };
  },
};
