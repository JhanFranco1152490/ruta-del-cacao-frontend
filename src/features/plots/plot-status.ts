import type { Plot } from './api';

export type PlotDisplayStatus = 'active' | 'inactive';

// Etiqueta y tono de cada estado: los comparten el badge, la lista y el polígono del mapa.
export const PLOT_STATUS_DISPLAY = {
  active: { label: 'Activa', tone: 'ok' },
  inactive: { label: 'Inactiva', tone: 'warn' },
} as const;

export const plotStatus = (plot: Pick<Plot, 'is_active'>): PlotDisplayStatus =>
  plot.is_active ? 'active' : 'inactive';
