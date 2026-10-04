'use client';

import { cn } from 'cn';
import { useState } from 'react';

import { ErrorState } from '@/components/error-state';

import { BaseLayerToggle } from './base-layer-toggle';
import { MapFocusControls } from './map-focus-controls';
import type { BaseLayerKind } from './base-layers';
import type {
  LoadPolygonEditorMapProvider,
  MapFocusTarget,
  PolygonEditorMapProviderProps,
} from './map-provider';
import { MapSkeleton } from './map-states';
import { useMapProvider } from './use-map-provider';

type PanelProps = Omit<
  PolygonEditorMapProviderProps,
  'baseLayer' | 'onBaseLayerUnavailable'
> & {
  // Referencia estable (una constante de módulo): cambiarla vuelve a cargar el mapa.
  loadProvider: LoadPolygonEditorMapProvider;
  // Ajustes del recuadro del mapa, p. ej. más alto en escritorio.
  frameClassName?: string;
  onRetry?: () => void;
  // Ir a la posición del GPS sin GPS encendido: se pide que lo enciendan y el mapa va a la
  // posición en cuanto llegue la primera lectura.
  onRequestGps?: () => void;
};

// El mapa donde se dibuja el polígono de una parcela. Es un apoyo: la lista de vértices y el GPS
// siguen sirviendo si el mapa no carga.
export function PolygonEditorMapPanel({
  loadProvider,
  frameClassName,
  onRetry,
  onRequestGps,
  ...providerProps
}: PanelProps) {
  const map = useMapProvider(loadProvider);
  const [baseLayer, setBaseLayer] = useState<BaseLayerKind>('map');
  const [baseUnavailable, setBaseUnavailable] = useState(false);
  const [focus, setFocus] = useState<{ target: MapFocusTarget }>();

  if (map.isLoading) {
    return <MapSkeleton className={cn('h-80', frameClassName)} />;
  }

  if (!map.Provider) {
    return (
      <ErrorState
        message="No fue posible cargar el mapa. Tus datos y vértices se conservan: puedes capturar vértices con el GPS y reintentar el mapa."
        onRetry={() => {
          map.retry();
          onRetry?.();
        }}
      />
    );
  }

  const { Provider } = map;

  return (
    <section aria-label="Mapa de la parcela" className="space-y-3">
      {/* Encima del recuadro y no sobre el mapa: en celular no tapa sus controles. */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MapFocusControls
          canGoToFarm={!!providerProps.farmPoint}
          farmLabel="Ir a la finca"
          hasGps={!!providerProps.gpsPosition}
          onFocus={(target) => setFocus({ target })}
          onRequestGps={onRequestGps}
        />
        <BaseLayerToggle
          onChange={(next) => {
            setBaseUnavailable(false);
            setBaseLayer(next);
          }}
          value={baseLayer}
        />
      </div>
      {/* `isolate`: Leaflet apila sus capas con z-index de 400 a 1000; sin encerrarlas, el mapa
          quedaría por encima de los diálogos y del menú móvil (z-50). */}
      <div
        data-slot="map-frame"
        className={cn(
          'isolate h-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-muted',
          frameClassName,
        )}
      >
        <Provider
          {...providerProps}
          baseLayer={baseLayer}
          focus={focus}
          onBaseLayerUnavailable={() => setBaseUnavailable(true)}
        />
      </div>
      {baseUnavailable && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          El mapa base no está disponible ahora. Los vértices y los polígonos se
          siguen viendo, y puedes seguir dibujando.
        </p>
      )}
    </section>
  );
}
