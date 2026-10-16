import { cn } from 'cn';
import { MapPinned } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { useNarrowContainer } from '@/hooks/use-narrow-container';
import { formatHectares } from '@/lib/format/hectares';

import type { KnownPlot } from '../known-plots';
import { plotStatus } from '../plot-status';
import { PlotStatusBadge } from './plot-status-badge';
import { plotLabel } from '@/lib/format/place-label';

// Con menos ancho que este (en px, del contenido de la tarjeta) los botones de icono no caben junto
// al código, el área y el estado: pasan al menú «⋯».
const NARROW_CARD_PX = 400;

// Lo que cada tarjeta le dice a quien pinta sus acciones.
export type PlotCardContext = {
  // La tarjeta es angosta: solo el «⋯», con todo lo demás adentro.
  compact: boolean;
  // Ver la parcela en el mapa de al lado; ausente si no hay mapa o la parcela no tiene polígono.
  showOnMap?: () => void;
};

type PlotListProps<T extends KnownPlot> = {
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
  renderShortcuts?: (plot: T, card: PlotCardContext) => ReactNode;
  renderActions?: (plot: T, card: PlotCardContext) => ReactNode;
  // El nombre de la lista; con varias en la misma pantalla (una por grupo), el de su grupo.
  label?: string;
  // Las columnas de la lista; por defecto dos desde pantallas medianas.
  className?: string;
};

// La lista es la forma accesible de recorrer las parcelas: el mapa que la acompaña es un apoyo.
export function PlotList<T extends KnownPlot>({
  plots,
  className,
  label = 'Parcelas',
  ...card
}: PlotListProps<T>) {
  return (
    <ul
      className={cn('grid gap-3', className ?? 'md:grid-cols-2')}
      aria-label={label}
    >
      {plots.map((plot) => (
        <li key={plot.id}>
          <PlotCard plot={plot} {...card} />
        </li>
      ))}
    </ul>
  );
}

function PlotCard<T extends KnownPlot>({
  plot,
  onShowOnMap,
  highlightedId,
  renderDetails,
  renderShortcuts,
  renderActions,
}: { plot: T } & Omit<PlotListProps<T>, 'plots' | 'label' | 'className'>) {
  const [ref, compact] = useNarrowContainer<HTMLElement>(NARROW_CARD_PX);
  const hasPolygon = plot.vertices.length >= 3;
  const showOnMap =
    hasPolygon && onShowOnMap ? () => onShowOnMap(plot) : undefined;
  const context: PlotCardContext = { compact, showOnMap };
  const actions = renderActions?.(plot, context);
  const shortcuts = renderShortcuts?.(plot, context);

  return (
    <article
      aria-labelledby={`plot-${plot.id}-code`}
      className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-card p-4 data-[highlighted]:ring-3 data-[highlighted]:ring-cobre"
      data-highlighted={plot.id === highlightedId || undefined}
      ref={ref}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 id={`plot-${plot.id}-code`} className="text-lg text-selva">
          {plotLabel(plot)}
        </h3>
        <p className="text-sm text-muted-foreground">
          {/* En una tarjeta angosta solo el valor: la etiqueta ocupa lo que le falta al «⋯». */}
          {!compact && 'Área: '}
          <strong className="text-foreground">
            {formatHectares(plot.areaHectares)}
          </strong>
        </p>
        <PlotStatusBadge status={plotStatus(plot)} />
        {/* Lo que se hace con la parcela, arriba a la derecha y sin gastar una fila. En una tarjeta
            angosta queda solo el «⋯». */}
        {(showOnMap || shortcuts || actions) && (
          <div className="ml-auto flex items-center gap-1.5">
            {showOnMap && !compact && (
              <Button
                aria-label={`Ver ${plotLabel(plot)} en el mapa`}
                className="size-10 px-0"
                onClick={showOnMap}
                size="office"
                title="Ver en el mapa"
                type="button"
                variant="action"
              >
                <MapPinned aria-hidden="true" className="size-4" />
              </Button>
            )}
            {shortcuts}
            {actions}
          </div>
        )}
      </div>
      {plot.queue?.status === 'error' && plot.queue.errorMessage && (
        <p className="rounded-(--radius) bg-err-bg px-3 py-2 text-sm font-bold text-err">
          {plot.queue.errorMessage}
        </p>
      )}
      {!hasPolygon && (
        <p className="text-sm font-bold text-muted-foreground">Sin polígono</p>
      )}
      {renderDetails?.(plot)}
    </article>
  );
}
