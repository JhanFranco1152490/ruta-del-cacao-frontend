import {
  getOfflineDb,
  type QueueItem,
  type QueueOperation,
  type QueueStatus,
} from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

import type { Plot, PlotCreateRequest, PlotUpdateRequest } from './api';
import {
  type DraftVertex,
  fromApiBoundary,
  toApiBoundary,
} from './plot-vertices';

export const PLOT_RESOURCE = 'plots';

// Lo que escribe la persona en el formulario de una parcela. Sin vértices, la parcela queda sin
// polígono.
export type PlotFormValues = {
  code: string;
  area_hectares: string;
  vertices: DraftVertex[];
};

type PlotFields = Required<
  Pick<PlotCreateRequest, 'code' | 'area_hectares' | 'boundary'>
>;

// Lo que guarda la cola. Una parcela nueva lleva el id del dispositivo y su finca; la edición de
// una del servidor, la versión que se leyó (el id de la parcela es el del item de la cola).
export type PlotCreatePayload = PlotFields & { id: string; farm_id: string };
export type PlotUpdatePayload = PlotFields &
  Required<Pick<PlotUpdateRequest, 'expected_version'>>;

// Versión con la que el servidor crea toda parcela: la única que conoce el dispositivo que la
// creó. Editarla esperando esa versión aplica el cambio si nadie la tocó desde entonces.
export const CREATED_PLOT_VERSION = 1;

export const toFields = (values: PlotFormValues): PlotFields => ({
  code: values.code,
  area_hectares: values.area_hectares,
  boundary: values.vertices.length ? toApiBoundary(values.vertices) : null,
});

export const toFormValues = (fields: PlotFields): PlotFormValues => ({
  code: fields.code,
  area_hectares: fields.area_hectares,
  vertices: fromApiBoundary(fields.boundary),
});

export const plotToFormValues = (plot: Plot): PlotFormValues => ({
  code: plot.code,
  area_hectares: plot.area_hectares,
  vertices: fromApiBoundary(plot.boundary),
});

// Un alta pendiente que en realidad ya existe en el servidor (se perdió la respuesta) se reenvía
// como edición de esa parcela, con el contenido que tiene ahora en el dispositivo.
export const createToUpdate = (
  payload: PlotCreatePayload,
): PlotUpdatePayload => ({
  code: payload.code,
  area_hectares: payload.area_hectares,
  boundary: payload.boundary,
  expected_version: CREATED_PLOT_VERSION,
});

// Toda parcela nueva se guarda primero en el dispositivo, con o sin conexión. El `parentId` es
// la finca: si la finca todavía está en la cola, la parcela espera a que sincronice. El id lo
// genera el formulario una sola vez, así que guardar dos veces no crea dos parcelas.
export const enqueuePlotCreate = (
  userId: string,
  id: string,
  farmId: string,
  values: PlotFormValues,
) =>
  enqueue(userId, {
    id,
    resource: PLOT_RESOURCE,
    operation: 'create',
    parentId: farmId,
    payload: {
      id,
      farm_id: farmId,
      ...toFields(values),
    } satisfies PlotCreatePayload,
  });

// Editar una parcela del servidor también pasa por la cola, con la versión que se leyó: si
// alguien la cambió mientras tanto, la API responde `stale_version` y la edición espera en la
// bandeja en vez de pisar el cambio ajeno. Con una edición ya esperando se rechaza: esta no es un
// reintento de aquella, y guardarla en silencio la perdería.
export const enqueuePlotUpdate = (
  userId: string,
  plotId: string,
  farmId: string,
  values: PlotFormValues,
  expectedVersion: number,
) =>
  enqueue(
    userId,
    {
      id: plotId,
      resource: PLOT_RESOURCE,
      operation: 'update',
      parentId: farmId,
      payload: {
        ...toFields(values),
        expected_version: expectedVersion,
      } satisfies PlotUpdatePayload,
    },
    { rejectExisting: true },
  );

export type QueuedPlot = {
  id: string;
  farmId: string;
  operation: QueueOperation;
  values: PlotFormValues;
  status: QueueStatus;
  expectedVersion?: number;
  errorCode?: string;
  errorMessage?: string;
  // Lo que el servidor devolvió con el error: la sugerencia de ajuste, el área calculada...
  errorData?: unknown;
};

function toQueuedPlot(item: QueueItem): QueuedPlot {
  // La cola de parcelas solo la escribe este módulo, siempre con estas formas.
  const payload = item.payload as PlotCreatePayload | PlotUpdatePayload;
  return {
    id: item.id,
    // El padre de toda parcela encolada es su finca.
    farmId: item.parentId!,
    operation: item.operation,
    values: toFormValues(payload),
    status: item.status,
    expectedVersion:
      'expected_version' in payload ? payload.expected_version : undefined,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
    errorData: item.errorData,
  };
}

export async function getQueuedPlot(
  userId: string,
  id: string,
): Promise<QueuedPlot | null> {
  const item = await getOfflineDb(userId).queue.get(id);
  if (!item || item.resource !== PLOT_RESOURCE) return null;
  return toQueuedPlot(item);
}

// Las parcelas de una finca que siguen en la cola de este dispositivo (pendientes o con error).
export async function listQueuedPlots(
  userId: string,
  farmId: string,
): Promise<QueuedPlot[]> {
  const items = await getOfflineDb(userId)
    .queue.where('parentId')
    .equals(farmId)
    .filter((item) => item.resource === PLOT_RESOURCE)
    .toArray();
  return items.map(toQueuedPlot);
}

// Corregir lo que sigue en la cola. Una edición puede reenviarse con otra versión: la de la
// parcela vigente en el servidor, después de revisar un `stale_version`.
export const resubmitPlot = (
  userId: string,
  plot: QueuedPlot,
  values: PlotFormValues,
  expectedVersion = plot.expectedVersion,
) =>
  resubmit(
    userId,
    plot.id,
    plot.operation === 'create'
      ? ({
          id: plot.id,
          farm_id: plot.farmId,
          ...toFields(values),
        } satisfies PlotCreatePayload)
      : ({
          ...toFields(values),
          expected_version: expectedVersion!,
        } satisfies PlotUpdatePayload),
  );
