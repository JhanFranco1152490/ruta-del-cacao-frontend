import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import {
  isRetryableStatus,
  rejectionConflict,
  type SyncAdapter,
  VALIDATION_ERROR_CODE,
} from '@/lib/offline/adapters';

import { DRYING_ERROR, postLog } from './api';
import { LOG_RESOURCE, type LogPayload } from './log-queue';

export const DRYING_GONE_MESSAGE =
  'El secado de este lote ya no está disponible.';
export const DRYING_FINISHED_MESSAGE =
  'El secado de este lote ya se finalizó: la bitácora no se registró.';
// El envío anterior sí llegó y la bitácora se corrigió en línea antes de este reintento: el servidor
// la tiene con otros datos. No hay nada que corregir aquí, solo quitarla del dispositivo.
export const LOG_ALREADY_SENT_MESSAGE =
  'Esta bitácora ya llegó al servidor con otros datos. Revísala en la ficha del lote y descarta esta copia del teléfono.';

// Lo que la persona puede arreglar reabriendo lo capturado: un dato fuera de rango o una fecha en la
// que ya hay otra bitácora. Lo demás no mejora corrigiendo: solo se descarta.
const CORRECTABLE = new Set<string>([
  VALIDATION_ERROR_CODE,
  DRYING_ERROR.duplicateLogDate,
]);

export const isCorrectableLogError = (code: string | undefined) =>
  !!code && CORRECTABLE.has(code);

export const logSyncAdapter: SyncAdapter = {
  resource: LOG_RESOURCE,

  // Una bitácora nueva cambia la lista de Secado y el secado de la ficha del lote.
  refreshAfterSync: () => [queryKeys.drying.all()],

  send(item) {
    const { lotId, request } = item.payload as LogPayload;
    return postLog(lotId, request);
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta: el mismo
  // envío repetido responde bien sin duplicar, aun después de finalizar. Un `404` es el lote que la
  // cuenta ya no alcanza. Con la fecha repetida se guardan el campo y la bitácora que ya estaba,
  // para mostrarlos al corregir.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return { code: error.code, message: DRYING_GONE_MESSAGE };
    }
    if (error.code === DRYING_ERROR.notInProgress) {
      return { code: error.code, message: DRYING_FINISHED_MESSAGE };
    }
    if (error.code === DRYING_ERROR.logIdConflict) {
      return { code: error.code, message: LOG_ALREADY_SENT_MESSAGE };
    }
    if (error.code === DRYING_ERROR.duplicateLogDate) {
      return {
        code: error.code,
        message: error.message,
        data: { fields: error.fields, existing: error.body.existing },
      };
    }
    return rejectionConflict(error);
  },
};
