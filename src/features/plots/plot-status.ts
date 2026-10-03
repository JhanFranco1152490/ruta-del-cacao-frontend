import type { KnownPlot } from './known-plots';

export type PlotDisplayStatus = 'active' | 'inactive' | 'pending' | 'error';

// Etiqueta y tono de cada estado: los comparten el badge, la lista y el polígono del mapa.
export const PLOT_STATUS_DISPLAY = {
  active: { label: 'Activa', tone: 'ok' },
  inactive: { label: 'Inactiva', tone: 'warn' },
  pending: { label: 'Pendiente de sincronización', tone: 'info' },
  error: { label: 'Pendiente con error', tone: 'err' },
} as const;

// Lo que está en la cola manda sobre el estado del servidor: pendiente o con error.
export const plotStatus = (
  plot: Pick<KnownPlot, 'isActive' | 'queue'>,
): PlotDisplayStatus =>
  plot.queue ? plot.queue.status : plot.isActive ? 'active' : 'inactive';
