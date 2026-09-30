'use client';

import { MapPinned } from 'lucide-react';
import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatGeoPoint, parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates } from '@/types/geo';

import type { LoadMapProvider, MapProvider } from './map-provider';

type ProviderState = {
  attempt: number;
  // Dentro de un objeto: pasar el componente solo a setState lo tomaría como función de
  // actualización.
  Provider?: MapProvider;
  failed?: boolean;
};

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
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProviderState>({ attempt: -1 });

  useEffect(() => {
    let cancelled = false;
    loadProvider().then(
      (Provider) => {
        if (!cancelled) setState({ attempt, Provider });
      },
      () => {
        if (!cancelled) setState({ attempt, failed: true });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt, loadProvider]);

  const retry = () => {
    setAttempt((current) => current + 1);
    onRetry?.();
  };

  if (state.attempt !== attempt) {
    return (
      <section aria-label="Mapa de ubicación" className="space-y-3">
        <Skeleton className="h-80 w-full rounded-[var(--radius-card)]" />
        <p className="text-sm font-bold text-muted-foreground" role="status">
          Cargando mapa…
        </p>
      </section>
    );
  }

  if (state.failed || !state.Provider) {
    return (
      <ErrorState
        message="No fue posible cargar el mapa. Puedes seguir usando el GPS o escribir las coordenadas."
        onRetry={retry}
      />
    );
  }

  const { Provider } = state;
  const point = parseCoordinates(location);

  return (
    <section aria-label="Mapa de ubicación" className="space-y-3">
      <div className="h-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted">
        <Provider
          disabled={disabled}
          onError={() => setState({ attempt, failed: true })}
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
