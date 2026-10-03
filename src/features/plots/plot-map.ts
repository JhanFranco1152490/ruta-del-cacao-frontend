import type { MapShape } from '@/components/map/map-provider';
import { formatHectares } from '@/lib/format/hectares';

import type { KnownPlot } from './known-plots';
import { PLOT_STATUS_DISPLAY, plotStatus } from './plot-status';

// El contorno de cada parcela que lo tiene; las demás no se dibujan y la lista las marca con
// "Sin polígono".
export const plotsToShapes = (plots: readonly KnownPlot[]): MapShape[] =>
  plots.flatMap((plot) => {
    if (plot.vertices.length < 3) return [];
    const { label, tone } = PLOT_STATUS_DISPLAY[plotStatus(plot)];
    return [
      {
        id: plot.id,
        label: plot.code,
        detail: `${formatHectares(plot.areaHectares)} · ${label}`,
        positions: plot.vertices.map(({ latitude, longitude }) => ({
          latitude,
          longitude,
        })),
        tone,
      },
    ];
  });
