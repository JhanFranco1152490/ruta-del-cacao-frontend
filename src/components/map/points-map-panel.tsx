'use client';

import { type ReactNode, useState } from 'react';

import { ErrorState } from '@/components/error-state';

import { BaseLayerToggle } from './base-layer-toggle';
import type { BaseLayerKind } from './base-layers';
import type { LoadPointsMapProvider, MapPoint, MapShape } from './map-provider';
import { MapSkeleton } from './map-states';
import { useMapProvider } from './use-map-provider';
import { MapVisibilityButton } from './map-visibility-button';

// Mapa de consulta con varios puntos. Es un apoyo visual: la lista que lo acompaña sigue
// siendo la forma accesible de recorrer los mismos datos.
export function PointsMapPanel({
  label,
  points,
  shapes = [],
  focus,
  onSelectShape,
  emptyMessage,
  toolbar,
  loadProvider,
}: {
  label: string;
  points: readonly MapPoint[];
  shapes?: readonly MapShape[];
  focus?: { shapeId: string };
  onSelectShape?: (id: string) => void;
  emptyMessage: string;
  // Lo que acompaña a los controles del mapa, a su izquierda (p. ej. un total). Se ve aunque el
  // mapa esté oculto o no haya cargado.
  toolbar?: ReactNode;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadPointsMapProvider;
}) {
  const map = useMapProvider(loadProvider);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>('map');
  const [visible, setVisible] = useState(true);

  const { Provider } = map;

  return (
    <section aria-label={label} className="space-y-2">
      {(toolbar || Provider) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>{toolbar}</div>
          {Provider && (
            <div className="ml-auto flex items-center gap-2">
              {visible && (
                <BaseLayerToggle onChange={setBaseLayer} value={baseLayer} />
              )}
              <MapVisibilityButton
                onToggle={() => setVisible((value) => !value)}
                visible={visible}
              />
            </div>
          )}
        </div>
      )}
      {map.isLoading ? (
        <MapSkeleton className="h-64 md:h-80" />
      ) : !Provider ? (
        <ErrorState
          message="No fue posible cargar el mapa. La lista de abajo sigue disponible."
          onRetry={map.retry}
        />
      ) : (
        <>
          {/* `isolate`: Leaflet apila sus capas con z-index de 400 a 1000; sin encerrarlas, el mapa
              quedaría por encima de los diálogos y del menú móvil (z-50). */}
          {visible && (
            <div
              data-slot="map-frame"
              className="isolate h-64 overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted md:h-80"
            >
              <Provider
                baseLayer={baseLayer}
                focus={focus}
                onError={map.fail}
                onSelectShape={onSelectShape}
                points={points}
                shapes={shapes}
              />
            </div>
          )}
          {visible && points.length === 0 && shapes.length === 0 && (
            <p className="text-sm font-bold text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </>
      )}
    </section>
  );
}
