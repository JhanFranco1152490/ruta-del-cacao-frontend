'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

import { OPERATING_AREA_VIEW } from '@/lib/departments';

import {
  pinIcon,
  popupContent,
  toGeoPoint,
  toLatLng,
  useBaseLayer,
  useLatest,
  useLeafletMap,
} from './leaflet-shared';
import type { MapProviderProps, PointsMapProviderProps } from './map-provider';
import { MAX_FIT_ZOOM, POINT_ZOOM, pointsKey, viewFor } from './map-view';

export function LeafletPointMap({
  point,
  onPointChange,
  disabled,
  onError,
  baseLayer,
}: MapProviderProps) {
  const { containerRef, map } = useLeafletMap();
  useBaseLayer(map, baseLayer, onError);
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
  const { containerRef, map } = useLeafletMap();
  useBaseLayer(map, 'map', onError);
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
