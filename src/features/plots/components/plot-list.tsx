import { cn } from 'cn';
import { MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { formatHectares } from '@/lib/format/hectares';

import type { KnownPlot } from '../known-plots';
import { plotStatus } from '../plot-status';
import { PlotStatusBadge } from './plot-status-badge';

// La lista es la forma accesible de recorrer las parcelas: el mapa que la acompaña es un apoyo.
export function PlotList<T extends KnownPlot>({
  plots,
  onShowOnMap,
  highlightedId,
  renderDetails,
  renderShortcuts,
  renderActions,
  label = 'Parcelas',
  className,
}: {
  plots: readonly T[];
  // Sin mapa al lado, la tarjeta no ofrece verla en él.
  onShowOnMap?: (plot: T) => void;
  // La parcela tocada en el mapa.
  highlightedId?: string;
  // Lo que otro dominio cuenta de cada parcela (su ficha agronómica, por ejemplo), sin que esta
  // lista lo conozca.
  renderDetails?: (plot: T) => ReactNode;
  // Atajos de otro dominio, como botones de icono junto a «Ver en el mapa» (programar una
  // actividad, por ejemplo).
  renderShortcuts?: (plot: T) => ReactNode;
  renderActions?: (plot: T) => ReactNode;
  // El nombre de la lista; con varias en la misma pantalla (una por grupo), el de su grupo.
  label?: string;
  // Las columnas de la lista; por defecto dos desde pantallas medianas.
  className?: string;
}) {
  return (
    <ul
      className={cn('grid gap-3', className ?? 'md:grid-cols-2')}
      aria-label={label}
    >
      {plots.map((plot) => {
        const hasPolygon = plot.vertices.length >= 3;
        const canShowOnMap = hasPolygon && onShowOnMap;
        const actions = renderActions?.(plot);
        const shortcuts = renderShortcuts?.(plot);
        return (
          <li key={plot.id}>
            <article
              aria-labelledby={`plot-${plot.id}-code`}
              className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-card p-4 data-[highlighted]:ring-3 data-[highlighted]:ring-cobre"
              data-highlighted={plot.id === highlightedId || undefined}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h3 id={`plot-${plot.id}-code`} className="text-lg text-selva">
                  {plot.code}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Área:{' '}
                  <strong className="text-foreground">
                    {formatHectares(plot.areaHectares)}
                  </strong>
                </p>
                <div className="ml-auto">
                  <PlotStatusBadge status={plotStatus(plot)} />
                </div>
              </div>
              {plot.queue?.status === 'error' && plot.queue.errorMessage && (
                <p className="rounded-(--radius) bg-err-bg px-3 py-2 text-sm font-bold text-err">
                  {plot.queue.errorMessage}
                </p>
              )}
              {!hasPolygon && (
                <p className="text-sm font-bold text-muted-foreground">
                  Sin polígono
                </p>
              )}
              {renderDetails?.(plot)}
              {(canShowOnMap || shortcuts || actions) && (
                <div className="mt-auto flex items-center justify-end gap-2 pt-1">
                  {shortcuts}
                  {canShowOnMap && (
                    <Button
                      aria-label={`Ver ${plot.code} en el mapa`}
                      onClick={() => onShowOnMap?.(plot)}
                      size="office"
                      title="Ver en el mapa"
                      type="button"
                      variant="action"
                      className="px-3"
                    >
                      <MapPinned aria-hidden="true" className="size-4" />
                    </Button>
                  )}
                  {actions}
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
