import { isApiError } from '@/lib/api/errors';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { putCharacterization } from './api';
import {
  CHARACTERIZATION_RESOURCE,
  type CharacterizationPayload,
} from './characterization-queue';

export const CHARACTERIZATION_PLOT_DELETED_CODE =
  'characterization_plot_deleted';
export const CHARACTERIZATION_PLOT_DELETED_MESSAGE =
  'La parcela de esta caracterización fue eliminada. Descarta este registro.';

export const characterizationSyncAdapter: SyncAdapter = {
  resource: CHARACTERIZATION_RESOURCE,

  // El padre del registro es la parcela, y la ficha se guarda en su dirección. El contenido ya
  // es el cuerpo del PUT: la versión leída y la hora en que se guardó en el dispositivo.
  async send(item) {
    await putCharacterization(
      item.parentId!,
      item.payload as CharacterizationPayload,
    );
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta. El resto
  // (versión obsoleta, variedad desactivada, parcela o finca inactiva, datos rechazados) no
  // mejora reintentando: va a la bandeja con el mensaje del servidor. Con `stale_version` se
  // guarda la ficha vigente, para mostrarla al corregir sin otra consulta.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return {
        code: CHARACTERIZATION_PLOT_DELETED_CODE,
        message: CHARACTERIZATION_PLOT_DELETED_MESSAGE,
      };
    }
    return {
      code: error.code,
      message: error.message,
      data:
        'current' in error.body ? { current: error.body.current } : undefined,
    };
  },
};
