import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { HARVEST_ERROR, postHarvest } from './api';
import { HARVEST_RESOURCE, type HarvestPayload } from './harvest-queue';

export const HARVEST_PLOT_GONE_CODE = 'harvest_plot_gone';
const VALIDATION_ERROR_CODE = 'validation_error';

export const HARVEST_PLOT_GONE_MESSAGE = 'Esta parcela ya no está disponible.';
export const VARIETY_NOT_IN_PLOT_MESSAGE =
  'Esta variedad ya no está en la ficha de la parcela. Elige otra.';
// El envío anterior sí llegó y la cosecha se corrigió en línea antes de este reintento: el servidor
// la tiene con otros datos. No hay nada que corregir aquí, solo quitarla del dispositivo.
export const HARVEST_ALREADY_SENT_MESSAGE =
  'Esta cosecha ya llegó al servidor con otros datos. Revísala en la lista de cosechas y descarta esta copia del teléfono.';

// Lo que la persona puede arreglar reabriendo lo capturado: un dato que el servidor no aceptó, una
// variedad que salió de la ficha, un recolector que ya no cumple o una ficha que quedó sin
// siembras. Lo demás no mejora corrigiendo: solo se descarta.
const CORRECTABLE = new Set<string>([
  VALIDATION_ERROR_CODE,
  HARVEST_ERROR.varietyNotInPlot,
  HARVEST_ERROR.collectorNotAvailable,
  HARVEST_ERROR.plotNotCharacterized,
]);

export const isCorrectableHarvestError = (code: string | undefined) =>
  !!code && CORRECTABLE.has(code);

export const harvestSyncAdapter: SyncAdapter = {
  resource: HARVEST_RESOURCE,

  // Una cosecha nueva cambia la lista del mes y los totales. El registro encolado no sabe qué mes
  // estaba abierto, así que se refrescan todas.
  refreshAfterSync: () => [queryKeys.harvests.all()],

  send: (item) =>
    postHarvest({
      ...(item.payload as HarvestPayload).request,
      // La hora en que se guardó en el dispositivo; informativa para el servidor.
      captured_at: new Date(item.createdAt).toISOString(),
    }),

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta: el mismo
  // envío repetido responde bien sin duplicar. Un `404` es la parcela eliminada o una finca que la
  // cuenta ya no alcanza. El resto va a la bandeja con el mensaje del servidor.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return {
        code: HARVEST_PLOT_GONE_CODE,
        message: HARVEST_PLOT_GONE_MESSAGE,
      };
    }
    if (error.code === HARVEST_ERROR.varietyNotInPlot) {
      return { code: error.code, message: VARIETY_NOT_IN_PLOT_MESSAGE };
    }
    if (error.code === HARVEST_ERROR.idConflict) {
      return { code: error.code, message: HARVEST_ALREADY_SENT_MESSAGE };
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
