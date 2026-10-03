'use client';

import { cn } from 'cn';
import { LocateFixed, MapPinned } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';

import { BaseLayerToggle } from './base-layer-toggle';
import type { BaseLayerKind } from './base-layers';
import type {
  LoadPolygonEditorMapProvider,
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
  const [focus, setFocus] = useState<{ target: 'farm' | 'gps' }>();
  // La persona pidió ir a su ubicación sin GPS: se va cuando llegue la primera lectura.
  const [waitingForGps, setWaitingForGps] = useState(false);
  const hasGps = !!providerProps.gpsPosition;

  // Llegó la lectura que se esperaba: se va a la posición. Se resuelve al dibujar y no en un
  // efecto, porque es un estado que se deriva de lo que acaba de cambiar.
  if (waitingForGps && hasGps) {
    setWaitingForGps(false);
    setFocus({ target: 'gps' });
  }

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
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!providerProps.farmPoint}
            onClick={() => setFocus({ target: 'farm' })}
            size="office"
            type="button"
            variant="outline"
          >
            <MapPinned aria-hidden="true" className="size-4" /> Ir a la finca
          </Button>
          <Button
            disabled={!hasGps && !onRequestGps}
            onClick={() => {
              if (hasGps) {
                setFocus({ target: 'gps' });
                return;
              }
              // Sin GPS encendido, se enciende y se va en cuanto haya una lectura.
              setWaitingForGps(true);
              onRequestGps?.();
            }}
            size="office"
            type="button"
            variant="outline"
          >
            <LocateFixed aria-hidden="true" className="size-4" />
            {waitingForGps ? 'Buscando tu ubicación…' : 'Ir a mi ubicación'}
          </Button>
        </div>
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
