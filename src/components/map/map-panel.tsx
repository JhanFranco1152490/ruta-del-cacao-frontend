'use client';

import { MapPinned } from 'lucide-react';

import { ErrorState } from '@/components/error-state';
import { formatGeoPoint, parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates } from '@/types/geo';

import type { LoadMapProvider } from './map-provider';
import { MapSkeleton } from './map-states';
import { useMapProvider } from './use-map-provider';

export function MapPanel({
  location,
  onLocationChange,
  onRetry,
  disabled = false,
  loadProvider,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  onRetry?: () => void;
  disabled?: boolean;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadMapProvider;
}) {
  const map = useMapProvider(loadProvider);

  if (map.isLoading) return <MapSkeleton className="h-80" />;

  if (!map.Provider) {
    return (
      <ErrorState
        message="No fue posible cargar el mapa. Puedes seguir usando el GPS o escribir las coordenadas."
        onRetry={() => {
          map.retry();
          onRetry?.();
        }}
      />
    );
  }

  const { Provider } = map;
  const point = parseCoordinates(location);

  return (
    <section aria-label="Mapa de ubicación" className="space-y-3">
      <div className="h-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted">
        <Provider
          disabled={disabled}
          onError={map.fail}
          onPointChange={(next) => onLocationChange(formatGeoPoint(next))}
          point={point}
        />
      </div>
      {/* Debajo del mapa y no encima: así no tapa sus controles ni la atribución. */}
      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
        <MapPinned aria-hidden="true" className="size-4 text-selva" />
        {point
          ? `Punto de la finca: ${location.latitude}, ${location.longitude}`
          : 'Toca el mapa para marcar el punto de la finca.'}
      </p>
    </section>
  );
}
