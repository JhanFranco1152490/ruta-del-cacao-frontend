'use client';

import { ErrorState } from '@/components/error-state';

import type { LoadPointsMapProvider, MapPoint, MapShape } from './map-provider';
import { MapSkeleton } from './map-states';
import { useMapProvider } from './use-map-provider';

// Mapa de consulta con varios puntos. Es un apoyo visual: la lista que lo acompaña sigue
// siendo la forma accesible de recorrer los mismos datos.
export function PointsMapPanel({
  label,
  points,
  shapes = [],
  focus,
  emptyMessage,
  loadProvider,
}: {
  label: string;
  points: readonly MapPoint[];
  shapes?: readonly MapShape[];
  focus?: { shapeId: string };
  emptyMessage: string;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadPointsMapProvider;
}) {
  const map = useMapProvider(loadProvider);

  if (map.isLoading) return <MapSkeleton className="h-64 md:h-80" />;

  if (!map.Provider) {
    return (
      <ErrorState
        message="No fue posible cargar el mapa. La lista de abajo sigue disponible."
        onRetry={map.retry}
      />
    );
  }

  const { Provider } = map;

  return (
    <section aria-label={label} className="space-y-2">
      {/* `isolate`: Leaflet apila sus capas con z-index de 400 a 1000; sin encerrarlas, el mapa
          quedaría por encima de los diálogos y del menú móvil (z-50). */}
      <div
        data-slot="map-frame"
        className="isolate h-64 overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted md:h-80"
      >
        <Provider
          focus={focus}
          onError={map.fail}
          points={points}
          shapes={shapes}
        />
      </div>
      {points.length === 0 && shapes.length === 0 && (
        <p className="text-sm font-bold text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}
