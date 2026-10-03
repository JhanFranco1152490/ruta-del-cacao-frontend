'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

import { OPERATING_AREA_VIEW } from '@/lib/departments';
import { OPERATING_AREA_BOUNDS } from '@/lib/geo/operating-area';
import type { GeoBounds } from '@/types/geo';

import {
  cssVar,
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

const toLatLngBounds = ({ south, west, north, east }: GeoBounds) =>
  L.latLngBounds([south, west], [north, east]);

// Margen alrededor del departamento al arrastrar el mapa del formulario: deja ver el borde sin
// perderse en los departamentos vecinos.
const AREA_MARGIN = 0.05;

export function LeafletPointMap({
  point,
  onPointChange,
  disabled,
  onError,
  baseLayer,
  focusBounds,
}: MapProviderProps) {
  const { containerRef, map } = useLeafletMap();
  useBaseLayer(map, baseLayer, onError);

  // Solo en este mapa y no en el hook compartido: el mapa por municipios maneja sus propios
  // límites. No se puede arrastrar fuera de Norte de Santander ni alejar más que el departamento.
  useEffect(() => {
    if (!map) return;
    const limits = toLatLngBounds(OPERATING_AREA_BOUNDS).pad(AREA_MARGIN);
    map.setMaxBounds(limits);
    // Viscosidad 1: el borde frena el arrastre en seco en vez de dejar pasarse y rebotar.
    L.Util.setOptions(map, { maxBoundsViscosity: 1 });
    map.setMinZoom(map.getBoundsZoom(limits));
  }, [map]);

  const focusKey = focusBounds
    ? `${focusBounds.south},${focusBounds.west},${focusBounds.north},${focusBounds.east}`
    : null;
  const focusRef = useLatest(focusBounds);
  // Solo cuando cambia el área pedida, no en cada render ni cuando la persona mueve el mapa.
  useEffect(() => {
    const bounds = focusRef.current;
    if (!map || !bounds) return;
    map.fitBounds(toLatLngBounds(bounds));
  }, [map, focusKey, focusRef]);
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

// Zoom máximo al encuadrar polígonos: una parcela de pocas hectáreas pide más cercanía que un
// grupo de fincas.
const MAX_SHAPE_ZOOM = 17;

const shapesKey = (shapes: NonNullable<PointsMapProviderProps['shapes']>) =>
  shapes
    .map(
      (shape) =>
        `${shape.id}:${shape.tone}:${shape.label}:${shape.detail ?? ''}:${pointsKey(shape.positions)}`,
    )
    .join('|');

export function LeafletPointsMap({
  points,
  shapes = [],
  focus,
  onError,
}: PointsMapProviderProps) {
  const { containerRef, map } = useLeafletMap();
  useBaseLayer(map, 'map', onError);
  const pointsRef = useLatest(points);
  const shapesRef = useLatest(shapes);
  const markers = markersKey(points);
  const drawnShapes = shapesKey(shapes);
  const positions = pointsKey([
    ...points.map((point) => point.position),
    ...shapes.flatMap((shape) => shape.positions),
  ]);

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

  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup(
      shapesRef.current.map((shape) => {
        const color = cssVar(`--${shape.tone}-solid`);
        // El borde y el relleno llevan el color del estado; la etiqueta fija dice el código
        // aunque el color no se distinga.
        return L.polygon(shape.positions.map(toLatLng), {
          color,
          fillColor: color,
          fillOpacity: 0.25,
          weight: 2,
        })
          .bindTooltip(shape.label, {
            permanent: true,
            direction: 'center',
            className: 'map-plot-label',
          })
          .bindPopup(popupContent(shape.label, shape.detail));
      }),
    ).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, drawnShapes, shapesRef]);

  // Solo se encuadra cuando cambian las posiciones, no al mover el mapa ni al cambiar un nombre.
  useEffect(() => {
    if (!map) return;
    const view = viewFor([
      ...pointsRef.current.map((point) => point.position),
      ...shapesRef.current.flatMap((shape) => shape.positions),
    ]);
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
        maxZoom: shapesRef.current.length > 0 ? MAX_SHAPE_ZOOM : MAX_FIT_ZOOM,
      });
    }
  }, [map, positions, pointsRef, shapesRef]);

  // Un pedido de enfoque (el objeto cambia en cada pedido) lleva el mapa al polígono pedido.
  useEffect(() => {
    if (!map || !focus) return;
    const shape = shapesRef.current.find(({ id }) => id === focus.shapeId);
    if (!shape) return;
    map.fitBounds(L.latLngBounds(shape.positions.map(toLatLng)), {
      padding: [32, 32],
      maxZoom: MAX_SHAPE_ZOOM,
    });
  }, [map, focus, shapesRef]);

  return <div className="h-full w-full" ref={containerRef} />;
}
