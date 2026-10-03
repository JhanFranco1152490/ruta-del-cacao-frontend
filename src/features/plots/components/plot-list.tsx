import { MapPinned } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatHectares } from '@/lib/format/hectares';

import type { Plot } from '../api';
import { plotStatus } from '../plot-status';
import { PlotStatusBadge } from './plot-status-badge';

// La lista es la forma accesible de recorrer las parcelas: el mapa que la acompaña es un apoyo.
export function PlotList({
  plots,
  onShowOnMap,
}: {
  plots: readonly Plot[];
  onShowOnMap: (plot: Plot) => void;
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-label="Parcelas">
      {plots.map((plot) => (
        <li key={plot.id}>
          <article
            aria-labelledby={`plot-${plot.id}-code`}
            className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 id={`plot-${plot.id}-code`} className="text-lg text-selva">
                {plot.code}
              </h3>
              <PlotStatusBadge status={plotStatus(plot)} />
            </div>
            <p className="text-sm text-muted-foreground">
              Área:{' '}
              <strong className="text-foreground">
                {formatHectares(plot.area_hectares)}
              </strong>
            </p>
            {plot.boundary ? (
              <Button
                aria-label={`Ver ${plot.code} en el mapa`}
                className="mt-auto self-start"
                onClick={() => onShowOnMap(plot)}
                size="office"
                type="button"
                variant="outline"
              >
                <MapPinned aria-hidden="true" className="size-4" /> Ver en el
                mapa
              </Button>
            ) : (
              <p className="mt-auto text-sm font-bold text-muted-foreground">
                Sin polígono
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
