import { isApiError } from '@/lib/api/errors';
import { isRetryableStatus, type SyncAdapter } from '@/lib/offline/adapters';

import { patchPlot, plotReadsOf, postPlot } from './api';
import {
  createToUpdate,
  PLOT_RESOURCE,
  type PlotCreatePayload,
  type PlotUpdatePayload,
} from './plot-queue';

export const PLOT_DELETED_CODE = 'plot_deleted';
export const PLOT_DELETED_MESSAGE =
  'Esta parcela o su finca fue eliminada. Descarta este registro.';

// Los datos que la interfaz necesita para ofrecer la corrección sin otra consulta.
const CORRECTION_KEYS = [
  'measured_area_hectares',
  'overlaps',
  'suggested_boundary',
  'suggested_measured_area_hectares',
  'current',
] as const;

function correctionData(body: Record<string, unknown>) {
  const entries = CORRECTION_KEYS.filter((key) => key in body).map((key) => [
    key,
    body[key],
  ]);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export const plotSyncAdapter: SyncAdapter = {
  resource: PLOT_RESOURCE,

  // El padre de toda parcela encolada es su finca.
  refreshAfterSync: (item) => plotReadsOf(item.parentId!),

  async send(item) {
    if (item.operation === 'create') {
      await postPlot({
        ...(item.payload as PlotCreatePayload),
        // La hora en que se guardó en el dispositivo; informativa para el servidor.
        captured_at: new Date(item.createdAt).toISOString(),
      });
    } else {
      await patchPlot(item.id, item.payload as PlotUpdatePayload);
    }
  },

  // El alta llegó al servidor pero se perdió la respuesta, y luego se editó en el dispositivo:
  // el reenvío choca con la parcela ya creada (`plot_id_conflict`). La API solo incluye `current`
  // si esa parcela es del mismo productor; sin `current` es un choque real y va a la bandeja.
  recover(item, error) {
    if (
      item.operation !== 'create' ||
      !isApiError(error) ||
      error.code !== 'plot_id_conflict' ||
      !error.body.current
    ) {
      return null;
    }
    return {
      operation: 'update',
      payload: createToUpdate(item.payload as PlotCreatePayload),
    };
  },

  // Sin respuesta de la API (sin red) o con una que puede cambiar sola, se reintenta. El resto
  // (código repetido, versión obsoleta, reglas de área o de superposición, sin permiso) no
  // mejora reintentando: va a la bandeja con el mensaje del servidor y, si trae, la corrección.
  parseConflict(error) {
    if (!isApiError(error) || isRetryableStatus(error.status)) return null;
    // Un 404 es una parcela eliminada si se estaba editando, y una finca inexistente si se
    // estaba creando (la eliminaron mientras la parcela esperaba en el dispositivo): la API
    // responde igual para las dos, así que un solo mensaje las cubre.
    if (error.status === 404) {
      return { code: PLOT_DELETED_CODE, message: PLOT_DELETED_MESSAGE };
    }
    return {
      code: error.code,
      message: error.message,
      data: correctionData(error.body),
    };
  },
};
