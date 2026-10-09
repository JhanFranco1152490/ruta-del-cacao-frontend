import type { QueueOperation } from '@/lib/offline/db';

import type { Plot } from './api';
import { plotToFormValues, type QueuedPlot } from './plot-queue';
import type { DraftVertex } from './plot-vertices';

// Lo que le pasa a una parcela que sigue en la cola del dispositivo.
export type KnownPlotQueue = {
  status: 'pending' | 'error';
  operation: QueueOperation;
  errorMessage?: string;
  errorCode?: string;
};

// Una parcela de la finca tal como la conoce el dispositivo: la del servidor, la de la caché o la
// que sigue en la cola. Con esto se muestra la lista y se validan el área disponible, la
// superposición y los códigos.
export type KnownPlot = {
  id: string;
  code: string;
  areaHectares: string;
  isActive: boolean;
  vertices: DraftVertex[];
  // Solo las del servidor: con ella se activa, desactiva o elimina sin pisar un cambio ajeno.
  version?: number;
  // Presente mientras la parcela (o su edición) siga en la cola.
  queue?: KnownPlotQueue;
};

export const toQueue = (plot: QueuedPlot): KnownPlotQueue => ({
  status: plot.status === 'error' ? 'error' : 'pending',
  operation: plot.operation,
  errorMessage: plot.errorMessage,
  errorCode: plot.errorCode,
});

export const fromServer = (plot: Plot): KnownPlot => ({
  id: plot.id,
  code: plot.code,
  areaHectares: plot.area_hectares,
  isActive: plot.is_active,
  vertices: plotToFormValues(plot).vertices,
  version: plot.version,
});

// Lo pendiente en el dispositivo reemplaza a su copia del servidor (una edición pendiente cuenta
// con los datos nuevos). Una parcela pendiente se tiene por activa: así nace, y desactivar es en
// línea. Para una edición pendiente se conservan el estado y la versión del servidor.
export function mergeKnownPlots(
  server: readonly Plot[],
  queued: readonly QueuedPlot[],
): KnownPlot[] {
  const queuedById = new Map(queued.map((plot) => [plot.id, plot]));
  const merged = server.map((plot): KnownPlot => {
    const pending = queuedById.get(plot.id);
    if (!pending) return fromServer(plot);
    return {
      ...fromServer(plot),
      code: pending.values.code,
      areaHectares: pending.values.area_hectares,
      vertices: pending.values.vertices,
      queue: toQueue(pending),
    };
  });
  const serverIds = new Set(server.map((plot) => plot.id));
  const created = queued
    .filter((plot) => !serverIds.has(plot.id))
    .map((plot): KnownPlot => ({
      id: plot.id,
      code: plot.values.code,
      areaHectares: plot.values.area_hectares,
      isActive: true,
      vertices: plot.values.vertices,
      queue: toQueue(plot),
    }));
  return [...merged, ...created].sort((a, b) =>
    a.code.localeCompare(b.code, 'es', { sensitivity: 'base' }),
  );
}
