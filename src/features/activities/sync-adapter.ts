import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { ACTIVITY_ERROR, postCompletion } from './api';
import {
  COMPLETION_RESOURCE,
  type CompletionPayload,
} from './completion-queue';

export const COMPLETION_ACTIVITY_DELETED_CODE = 'activity_deleted';
export const COMPLETION_INPUT_INACTIVE_CODE = 'input_inactive';
const VALIDATION_ERROR_CODE = 'validation_error';

export const COMPLETION_ACTIVITY_DELETED_MESSAGE =
  'Esta actividad ya no existe.';
export const COMPLETION_ALREADY_DONE_MESSAGE =
  'Esta actividad ya fue registrada como realizada por otra persona.';

// Lo que la persona puede arreglar reabriendo lo capturado: un insumo que ya no está disponible o
// un dato que el servidor no aceptó. Lo demás no mejora corrigiendo: solo se descarta.
export const isCorrectableCompletionError = (code: string | undefined) =>
  code === COMPLETION_INPUT_INACTIVE_CODE || code === VALIDATION_ERROR_CODE;

export const completionSyncAdapter: SyncAdapter = {
  resource: COMPLETION_RESOURCE,

  // Al llegar al servidor cambian la actividad (queda realizada, también en la bandeja de
  // notificaciones) y las existencias de la finca, que descuentan lo gastado. El registro encolado
  // no sabe de qué mes ni de qué finca era la copia abierta, así que se refrescan todas.
  refreshAfterSync: () => [
    queryKeys.agriculturalActivities.all(),
    queryKeys.inputStocks.all(),
    queryKeys.notifications.all(),
  ],

  // El padre del registro es la actividad, y la realización se registra en su dirección.
  async send(item) {
    await postCompletion(
      item.parentId!,
      (item.payload as CompletionPayload).request,
    );
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta. El mismo
  // envío repetido responde bien y no descuenta dos veces, así que reintentar no hace daño. El
  // resto va a la bandeja: un `404` es la actividad eliminada (un insumo inexistente llega como
  // `validation_error`, justamente para no confundirse con esto), y con `input_inactive` se guardan
  // los insumos afectados para marcarlos al corregir.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return {
        code: COMPLETION_ACTIVITY_DELETED_CODE,
        message: COMPLETION_ACTIVITY_DELETED_MESSAGE,
      };
    }
    if (error.code === ACTIVITY_ERROR.alreadyDone) {
      return { code: error.code, message: COMPLETION_ALREADY_DONE_MESSAGE };
    }
    if (error.code === COMPLETION_INPUT_INACTIVE_CODE) {
      return {
        code: error.code,
        message: error.message,
        data: { input_ids: error.body.input_ids ?? [] },
      };
    }
    return {
      code: error.code,
      message: error.message,
      data:
        error.code === VALIDATION_ERROR_CODE
          ? { fields: error.fields }
          : undefined,
    };
  },
};
