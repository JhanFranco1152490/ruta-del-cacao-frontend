'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import { OPERATING_AREA_VIEW } from '@/lib/departments';
import type { GeoPoint } from '@/types/geo';

import type {
  MapPointTone,
  MapProviderProps,
  PointsMapProviderProps,
} from './map-provider';
import { MAX_FIT_ZOOM, POINT_ZOOM, pointsKey, viewFor } from './map-view';

// Mapa base de OpenStreetMap. Su política de uso exige mostrar la atribución y no permite
// descargar teselas en masa (por eso no se guardan para usarlas sin conexión).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const toLatLng = ({ latitude, longitude }: GeoPoint) =>
  L.latLng(latitude, longitude);
const toGeoPoint = ({ lat, lng }: L.LatLng): GeoPoint => ({
  latitude: lat,
  longitude: lng,
});

// Íconos propios: los de Leaflet se cargan por URL relativa y se rompen al empaquetarlo.
function pinIcon(tone: MapPointTone) {
  return L.divIcon({
    className: '',
    html: `<span class="map-pin" data-tone="${tone}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

// Guarda la última versión de un callback para usarla desde los eventos de Leaflet sin volver
// a registrarlos en cada render.
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

// Crea el mapa sobre su contenedor y lo destruye al desmontar. Avisa `onError` si el mapa
// base no carga ni una tesela (sin conexión, proveedor caído); una tesela suelta que falla no
// es motivo para ocultar el mapa.
function useLeafletMap(onError: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const onErrorRef = useLatest(onError);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = L.map(container, {
      center: toLatLng(OPERATING_AREA_VIEW.center),
      zoom: OPERATING_AREA_VIEW.zoom,
    });
    let loadedTiles = 0;
    let reported = false;
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION })
      .on('tileload', () => {
        loadedTiles += 1;
      })
      .on('tileerror', () => {
        if (loadedTiles > 0 || reported) return;
        reported = true;
        onErrorRef.current();
      })
      .addTo(instance);
    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, [onErrorRef]);

  return { containerRef, map };
}

export function LeafletPointMap({
  point,
  onPointChange,
  disabled,
  onError,
}: MapProviderProps) {
  const { containerRef, map } = useLeafletMap(onError);
  const markerRef = useRef<L.Marker | null>(null);
  const onPointChangeRef = useLatest(onPointChange);
  const disabledRef = useLatest(disabled);

  useEffect(() => {
    if (!map) return;
    const choose = (event: L.LeafletMouseEvent) => {
      if (!disabledRef.current)
        onPointChangeRef.current(toGeoPoint(event.latlng));
    };
    map.on('click', choose);
    return () => {
      map.off('click', choose);
    };
  }, [map, disabledRef, onPointChangeRef]);

  const latitude = point?.latitude;
  const longitude = point?.longitude;
  useEffect(() => {
    if (!map) return;
    if (latitude === undefined || longitude === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const position = L.latLng(latitude, longitude);
    if (!markerRef.current) {
      const marker = L.marker(position, {
        draggable: true,
        icon: pinIcon('ok'),
        title: 'Punto de la finca (arrástralo para ajustarlo)',
        alt: 'Punto de la finca',
      }).addTo(map);
      marker.on('dragend', () => {
        onPointChangeRef.current(toGeoPoint(marker.getLatLng()));
      });
      markerRef.current = marker;
      map.setView(position, Math.max(map.getZoom(), POINT_ZOOM));
      return;
    }
    markerRef.current.setLatLng(position);
    // Al escribir las coordenadas el punto puede salir de la vista: se le sigue.
    if (!map.getBounds().contains(position)) map.panTo(position);
  }, [map, latitude, longitude, onPointChangeRef]);

  useEffect(() => {
    const dragging = markerRef.current?.dragging;
    if (disabled) dragging?.disable();
    else dragging?.enable();
  }, [disabled, map, latitude, longitude]);

  useEffect(
    () => () => {
      markerRef.current = null;
    },
    [map],
  );

  return <div className="h-full w-full" ref={containerRef} />;
}

function popupContent(label: string, detail?: string) {
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

// Firma de lo que se dibuja: los marcadores solo se rehacen cuando cambia algo visible, no en
// cada render de la pantalla (eso cerraría un popup abierto).
const markersKey = (points: PointsMapProviderProps['points']) =>
  points
    .map(
      (point) =>
        `${point.id}:${point.tone}:${point.label}:${point.detail ?? ''}:${pointsKey([point.position])}`,
    )
    .join('|');

export function LeafletPointsMap({ points, onError }: PointsMapProviderProps) {
  const { containerRef, map } = useLeafletMap(onError);
  const pointsRef = useLatest(points);
  const markers = markersKey(points);
  const positions = pointsKey(points.map((point) => point.position));

  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup(
      pointsRef.current.map((point) =>
        L.marker(toLatLng(point.position), {
          icon: pinIcon(point.tone),
          title: point.detail
            ? `${point.label} · ${point.detail}`
            : point.label,
          alt: point.label,
          keyboard: true,
        }).bindPopup(popupContent(point.label, point.detail)),
      ),
    ).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, markers, pointsRef]);

  // Solo se encuadra cuando cambian las posiciones, no al mover el mapa ni al cambiar un nombre.
  useEffect(() => {
    if (!map) return;
    const view = viewFor(pointsRef.current.map((point) => point.position));
    if (view.kind === 'area') {
      map.setView(
        toLatLng(OPERATING_AREA_VIEW.center),
        OPERATING_AREA_VIEW.zoom,
      );
    } else if (view.kind === 'point') {
      map.setView(toLatLng(view.center), POINT_ZOOM);
    } else {
      map.fitBounds(L.latLngBounds(view.points.map(toLatLng)), {
        padding: [32, 32],
        maxZoom: MAX_FIT_ZOOM,
      });
    }
  }, [map, positions, pointsRef]);

  return <div className="h-full w-full" ref={containerRef} />;
}
