import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import {
  isRetryableStatus,
  rejectionConflict,
  type SyncAdapter,
  VALIDATION_ERROR_CODE,
} from '@/lib/offline/adapters';
import { deviationNoticeText } from '@/lib/postharvest/deviation-notice-text';

import { FERMENTATION_ERROR, postTurn, type SavedTurn } from './api';
import { TURN_RESOURCE, type TurnPayload } from './turn-queue';

export const FERMENTATION_GONE_MESSAGE =
  'La fermentación de este lote ya no está disponible.';
export const FERMENTATION_FINISHED_MESSAGE =
  'La fermentación de este lote ya se finalizó: el volteo no se registró.';
// El envío anterior sí llegó y el volteo se corrigió en línea antes de este reintento: el servidor
// lo tiene con otros datos. No hay nada que corregir aquí, solo quitarlo del dispositivo.
export const TURN_ALREADY_SENT_MESSAGE =
  'Este volteo ya llegó al servidor con otros datos. Revísalo en la ficha del lote y descarta esta copia del teléfono.';

// Lo que la persona puede arreglar reabriendo lo capturado: un dato fuera de rango o una hora en la
// que ya hay otro volteo. Lo demás no mejora corrigiendo: solo se descarta.
const CORRECTABLE = new Set<string>([
  VALIDATION_ERROR_CODE,
  FERMENTATION_ERROR.duplicateTurnTime,
]);

export const isCorrectableTurnError = (code: string | undefined) =>
  !!code && CORRECTABLE.has(code);

export const turnSyncAdapter: SyncAdapter = {
  resource: TURN_RESOURCE,

  // Un volteo nuevo cambia la lista de Fermentación y la fermentación de la ficha del lote.
  refreshAfterSync: () => [queryKeys.fermentation.all()],

  // Los desvíos de temperatura y pH los evalúa el servidor al recibirlo, también en un reenvío.
  syncNotice(item, response) {
    const { label } = item.payload as TurnPayload;
    return deviationNoticeText((response as SavedTurn).alerts ?? [], label);
  },

  send(item) {
    const { lotId, request } = item.payload as TurnPayload;
    return postTurn(lotId, request);
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta: el mismo
  // envío repetido responde bien sin duplicar, aun después de finalizar. Un `404` es el lote que la
  // cuenta ya no alcanza. Con la hora repetida se guardan el campo y el volteo que ya estaba, para
  // mostrarlos al corregir.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return { code: error.code, message: FERMENTATION_GONE_MESSAGE };
    }
    if (error.code === FERMENTATION_ERROR.notInProgress) {
      return { code: error.code, message: FERMENTATION_FINISHED_MESSAGE };
    }
    if (error.code === FERMENTATION_ERROR.turnIdConflict) {
      return { code: error.code, message: TURN_ALREADY_SENT_MESSAGE };
    }
    if (error.code === FERMENTATION_ERROR.duplicateTurnTime) {
      return {
        code: error.code,
        message: error.message,
        data: { fields: error.fields, existing: error.body.existing },
      };
    }
    return rejectionConflict(error);
  },
};
