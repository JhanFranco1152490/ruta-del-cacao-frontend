'use client';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import { OPERATING_AREA_VIEW } from '@/lib/departments';
import type { GeoPoint } from '@/types/geo';

import {
  BASE_LAYERS,
  type BaseLayerKind,
  createTileFallback,
} from './base-layers';
import type { MapPointTone } from './map-provider';

export const toLatLng = ({ latitude, longitude }: GeoPoint) =>
  L.latLng(latitude, longitude);
export const toGeoPoint = ({ lat, lng }: L.LatLng): GeoPoint => ({
  latitude: lat,
  longitude: lng,
});

// Los colores del mapa salen de los tokens del sistema de diseño, no se repiten aquí.
export const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Íconos propios: los de Leaflet se cargan por URL relativa y se rompen al empaquetarlo.
export function pinIcon(tone: MapPointTone) {
  return L.divIcon({
    className: '',
    html: `<span class="map-pin" data-tone="${tone}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

// Guarda la última versión de un valor para usarlo desde los eventos de Leaflet sin volver a
// registrarlos en cada render.
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

export function popupContent(label: string, detail?: string) {
  // Nodos y no HTML armado con texto: el nombre lo escribió una persona.
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = label;
  content.append(title);
  if (detail) {
    const line = document.createElement('div');
    line.textContent = detail;
    content.append(line);
  }
  return content;
}

// Crea el mapa sobre su contenedor y lo destruye al desmontar. El mapa base va aparte
// (`useBaseLayer`): así un mapa puede cambiarlo, o no tenerlo, sin volver a crearse.
// `zoomSnap` menor que 1 deja encuadrar con zoom fraccionario: una figura alta y angosta (el
// departamento) llena el recuadro en vez de quedar pequeña al redondear hacia abajo.
export function useLeafletMap({ zoomControl = true, zoomSnap = 1 } = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = L.map(container, {
      center: toLatLng(OPERATING_AREA_VIEW.center),
      zoom: OPERATING_AREA_VIEW.zoom,
      zoomControl,
      zoomSnap,
    });
    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, [zoomControl, zoomSnap]);

  return { containerRef, map };
}

// Mapa base con respaldo (ver `createTileFallback`). Si ninguna fuente carga, avisa
// `onUnavailable`; si pasa a una fuente de respaldo, avisa `onFallback` (y lo deja en la consola:
// el mapa sigue viéndose y, sin esto, nadie se enteraría de que el principal dejó de servir).
// Con `kind` en null el mapa queda sin mapa base.
export function useBaseLayer(
  map: L.Map | null,
  kind: BaseLayerKind | null,
  onUnavailable: () => void,
  onFallback?: () => void,
) {
  const onUnavailableRef = useLatest(onUnavailable);
  const onFallbackRef = useLatest(onFallback);

  useEffect(() => {
    if (!map || !kind) return;
    const sources = BASE_LAYERS[kind];
    const fallback = createTileFallback(sources.length);
    let layer: L.TileLayer | null = null;
    const show = (index: number) => {
      layer?.remove();
      const source = sources[index];
      layer = L.tileLayer(source.url, {
        attribution: source.attribution,
        maxZoom: source.maxZoom,
      })
        .on('tileload', () => fallback.tileLoaded(index))
        .on('tileerror', () => {
          const outcome = fallback.tileFailed(index);
          if (outcome === 'next') {
            console.warn(
              `El mapa base principal (${kind}) no responde: se usa el de respaldo.`,
            );
            onFallbackRef.current?.();
            show(index + 1);
          } else if (outcome === 'exhausted') onUnavailableRef.current();
        })
        .addTo(map);
      layer.bringToBack();
    };
    show(0);
    return () => {
      layer?.remove();
    };
  }, [map, kind, onUnavailableRef, onFallbackRef]);
}
