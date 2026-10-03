import type { components } from '@/lib/api/schema';

import type { Plot } from './api';
import type { KnownPlot } from './known-plots';
import { fromApiBoundary } from './plot-vertices';

type Overlap = components['schemas']['Overlap'];

// Lo que el servidor devolvió junto al error de una parcela en la bandeja (ver el adaptador de
// sincronización): solo trae las claves de ese error.
export type PlotErrorData = {
  overlaps?: Overlap[];
  current?: Plot;
  measured_area_hectares?: string;
  suggested_boundary?: components['schemas']['Vertex'][] | null;
};

export const asPlotErrorData = (data: unknown): PlotErrorData =>
  data && typeof data === 'object' ? (data as PlotErrorData) : {};

// Las parcelas que el servidor dijo invadidas, con su polígono: el dispositivo puede no
// conocerlas (se registraron desde otro teléfono) y sin ellas no podría resaltar la zona ni
// calcular el ajuste. Su área no se conoce, así que no cuentan para el área disponible.
export const overlappedNeighbours = (data: PlotErrorData): KnownPlot[] =>
  (data.overlaps ?? []).map((overlap) => ({
    id: overlap.plot_id,
    code: overlap.code,
    areaHectares: '0.00',
    isActive: true,
    vertices: fromApiBoundary(overlap.boundary),
  }));

// Suma a lo que ya conoce el dispositivo las parcelas que no conocía.
export const withNeighbours = (
  known: readonly KnownPlot[],
  extra: readonly KnownPlot[],
): KnownPlot[] => {
  const ids = new Set(known.map((plot) => plot.id));
  return [...known, ...extra.filter((plot) => !ids.has(plot.id))];
};
