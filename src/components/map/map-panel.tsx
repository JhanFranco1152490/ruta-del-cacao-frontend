'use client';

import { cn } from 'cn';
import { MapPinned } from 'lucide-react';
import { useState } from 'react';

import { formatGeoPoint, parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates, GeoBounds } from '@/types/geo';

import type { BaseLayerKind } from './base-layers';
import { MapFrame, MapHiddenBar } from './map-frame';
import type {
  GpsPosition,
  LoadMapProvider,
  MapFocusTarget,
} from './map-provider';
import { mapPlaceholder } from './map-states';
import { useMapProvider } from './use-map-provider';

export function MapPanel({
  location,
  onLocationChange,
  onRetry,
  disabled = false,
  frameClassName,
  focusBounds,
  gpsPosition,
  onRequestGps,
  loadProvider,
}: {
  location: Coordinates;
  onLocationChange: (location: Coordinates) => void;
  onRetry?: () => void;
  disabled?: boolean;
  // Ajustes del recuadro del mapa, p. ej. más alto en escritorio.
  frameClassName?: string;
  focusBounds?: GeoBounds | null;
  // Dónde está la persona según el GPS encendido, si lo está.
  gpsPosition?: GpsPosition | null;
  // Ir a la posición del GPS sin GPS encendido: se pide encenderlo.
  onRequestGps?: () => void;
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadMapProvider;
}) {
  const map = useMapProvider(loadProvider);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>('map');
  const [focus, setFocus] = useState<{ target: MapFocusTarget }>();
  const [visible, setVisible] = useState(true);

  const placeholder = mapPlaceholder(map, {
    className: cn('h-80', frameClassName),
    failureMessage:
      'No fue posible cargar el mapa. Puedes seguir usando el GPS o escribir las coordenadas.',
    onRetry,
  });
  if (placeholder || !map.Provider) return placeholder;

  const { Provider } = map;
  const point = parseCoordinates(location);

  return (
    <section aria-label="Mapa de ubicación" className="space-y-3">
      {visible ? (
        <MapFrame
          baseLayer={{ value: baseLayer, onChange: setBaseLayer }}
          className={cn('h-80', frameClassName)}
          focus={{
            canGoToFarm: !!point,
            farmLabel: 'Ir al punto de la finca',
            hasGps: !!gpsPosition,
            onFocus: (target) => setFocus({ target }),
            onRequestGps,
          }}
          onHide={() => setVisible(false)}
        >
          <Provider
            baseLayer={baseLayer}
            disabled={disabled}
            focus={focus}
            focusBounds={focusBounds}
            gpsPosition={gpsPosition}
            onError={map.fail}
            onPointChange={(next) => onLocationChange(formatGeoPoint(next))}
            point={point}
          />
        </MapFrame>
      ) : (
        <MapHiddenBar onShow={() => setVisible(true)} />
      )}
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
