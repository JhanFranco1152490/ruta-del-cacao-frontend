import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { type Lot, LOT_ERROR, postLot } from './api';
import { LOT_RESOURCE, type LotPayload } from './lot-queue';

export const LOT_HARVEST_GONE_CODE = 'lot_harvest_gone';

export const LOT_HARVEST_GONE_MESSAGE =
  'Esta cosecha ya no está disponible: no se puede conformar su lote.';
export const LOT_ALREADY_FORMED_MESSAGE =
  'Esta cosecha ya forma otro lote. Revisa la lista de lotes y descarta este.';

export const lotSyncAdapter: SyncAdapter = {
  resource: LOT_RESOURCE,

  // Un lote nuevo cambia el lote que muestra cada cosecha y la lista de lotes.
  refreshAfterSync: () => [queryKeys.harvests.all(), queryKeys.lots.all()],

  send: (item) => postLot((item.payload as LotPayload).request),

  // El código lo asigna el servidor al recibir el lote.
  assignedCode: (_item, response) => ({
    kind: 'lot',
    code: (response as Lot).code,
  }),

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta: el mismo
  // envío repetido responde bien sin duplicar. Un `404` es la cosecha eliminada o una finca que
  // la cuenta ya no alcanza. Nada de lo demás mejora corrigiendo: solo se descarta.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    if (error.status === 404) {
      return {
        code: LOT_HARVEST_GONE_CODE,
        message: LOT_HARVEST_GONE_MESSAGE,
      };
    }
    if (error.code === LOT_ERROR.harvestAlreadyInLot) {
      return { code: error.code, message: LOT_ALREADY_FORMED_MESSAGE };
    }
    return { code: error.code, message: error.message };
  },
};
