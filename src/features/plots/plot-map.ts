import type { MapShape } from '@/components/map/map-provider';
import { formatHectares } from '@/lib/format/hectares';

import type { Plot } from './api';
import { PLOT_STATUS_DISPLAY, plotStatus } from './plot-status';

// El contorno de cada parcela que lo tiene; las demás no se dibujan y la lista las marca con
// "Sin polígono".
export const plotsToShapes = (plots: readonly Plot[]): MapShape[] =>
  plots.flatMap((plot) => {
    if (!plot.boundary) return [];
    const { label, tone } = PLOT_STATUS_DISPLAY[plotStatus(plot)];
    return [
      {
        id: plot.id,
        label: plot.code,
        detail: `${formatHectares(plot.area_hectares)} · ${label}`,
        positions: plot.boundary.map((vertex) => ({
          latitude: Number(vertex.latitude),
          longitude: Number(vertex.longitude),
        })),
        tone,
      },
    ];
  });
