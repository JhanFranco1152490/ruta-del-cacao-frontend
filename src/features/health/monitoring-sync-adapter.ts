import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { HEALTH_ERROR, postMonitoringResult } from './monitoring-api';
import {
  MONITORING_RESOURCE,
  type MonitoringPayload,
} from './monitoring-queue';

export const MONITORING_DELETED_CODE = 'monitoring_deleted';
const VALIDATION_ERROR_CODE = 'validation_error';

export const MONITORING_DELETED_MESSAGE = 'Este monitoreo ya no existe.';
export const MONITORING_ALREADY_DONE_MESSAGE =
  'Este monitoreo ya fue registrado por otra persona.';

// Lo que la persona puede arreglar reabriendo lo capturado: una plaga o un insumo que dejó de estar
// activo, o un dato que el servidor no aceptó. Lo demás no mejora corrigiendo: solo se descarta.
export const isCorrectableMonitoringError = (code: string | undefined) =>
  code === HEALTH_ERROR.pestDiseaseInactive ||
  code === HEALTH_ERROR.inputInactive ||
  code === VALIDATION_ERROR_CODE;

export const monitoringSyncAdapter: SyncAdapter = {
  resource: MONITORING_RESOURCE,

  // Al llegar al servidor el monitoreo queda realizado (también en la bandeja de notificaciones),
  // sus controles hechos descuentan insumos de la finca y cambian el historial y el aviso de
  // detecciones. El registro encolado no sabe qué
  // copias estaban abiertas, así que se refrescan todas.
  refreshAfterSync: () => [
    queryKeys.agriculturalActivities.all(),
    queryKeys.inputStocks.all(),
    queryKeys.health.all(),
    queryKeys.notifications.all(),
  ],

  // El padre del registro es el monitoreo, y el resultado se registra en su dirección.
  async send(item) {
    await postMonitoringResult(
      item.parentId!,
      (item.payload as MonitoringPayload).request,
    );
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta. El mismo
  // envío repetido responde bien sin cambiar nada. El resto va a la bandeja: un `404` es el
  // monitoreo eliminado (una plaga inexistente llega como `validation_error`, justamente para no
  // confundirse con esto), y con `pest_disease_inactive` se guardan las afectadas para marcarlas
  // al corregir.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return {
        code: MONITORING_DELETED_CODE,
        message: MONITORING_DELETED_MESSAGE,
      };
    }
    if (error.code === HEALTH_ERROR.alreadyDone) {
      return { code: error.code, message: MONITORING_ALREADY_DONE_MESSAGE };
    }
    if (error.code === HEALTH_ERROR.pestDiseaseInactive) {
      return {
        code: error.code,
        message: error.message,
        data: { pest_disease_ids: error.body.pest_disease_ids ?? [] },
      };
    }
    // Un insumo de un control hecho en el momento, o el previsto de uno programado.
    if (error.code === HEALTH_ERROR.inputInactive) {
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
