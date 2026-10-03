'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useRef } from 'react';

import type { GeoPoint } from '@/types/geo';

import {
  cssVar,
  pinIcon,
  toGeoPoint,
  toLatLng,
  useBaseLayer,
  useLatest,
  useLeafletMap,
  useGpsPosition,
  useShapeLabelVisibility,
} from './leaflet-shared';
import type { PolygonEditorMapProviderProps } from './map-provider';
import { POINT_ZOOM, pointsKey } from './map-view';

// Zoom máximo al encuadrar el polígono de una parcela de pocas hectáreas.
const MAX_FIT_ZOOM = 18;

const vertexIcon = (number: number, flagged: boolean) =>
  L.divIcon({
    className: '',
    html: `<span class="map-vertex"${flagged ? ' data-flagged="true"' : ''}>${number}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export function LeafletPolygonEditor({
  vertices,
  drawing,
  disabled,
  baseLayer,
  farmPoint,
  referenceShapes,
  overlapRegions,
  flaggedVertices = [],
  suggestion,
  gpsPosition,
  focus,
  onAddVertex,
  onMoveVertex,
  onBaseLayerUnavailable,
}: PolygonEditorMapProviderProps) {
  const { containerRef, map } = useLeafletMap();
  useBaseLayer(map, baseLayer, onBaseLayerUnavailable);

  const onAddRef = useLatest(onAddVertex);
  const onMoveRef = useLatest(onMoveVertex);
  const drawingRef = useLatest(drawing);
  const disabledRef = useLatest(disabled);
  const verticesRef = useLatest(vertices);

  // Solo se agregan vértices con el modo de dibujo activo y el formulario habilitado.
  useEffect(() => {
    if (!map) return;
    const add = (event: L.LeafletMouseEvent) => {
      if (drawingRef.current && !disabledRef.current) {
        onAddRef.current(toGeoPoint(event.latlng));
      }
    };
    map.on('click', add);
    return () => {
      map.off('click', add);
    };
  }, [map, drawingRef, disabledRef, onAddRef]);

  // El cursor avisa que cada toque agrega un vértice.
  useEffect(() => {
    if (!map) return;
    map.getContainer().style.cursor = drawing && !disabled ? 'crosshair' : '';
  }, [map, drawing, disabled]);

  const farmKey = farmPoint ? pointsKey([farmPoint]) : '';
  useEffect(() => {
    if (!map || !farmPoint) return;
    const marker = L.marker(toLatLng(farmPoint), {
      icon: pinIcon('ok'),
      title: 'Punto de la finca',
      alt: 'Punto de la finca',
      interactive: false,
      keyboard: false,
    }).addTo(map);
    return () => {
      marker.remove();
    };
    // `farmKey` resume `farmPoint`: se rehace solo cuando cambia el punto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, farmKey]);

  const referenceKey = referenceShapes
    .map((shape) => `${shape.id}:${shape.label}:${pointsKey(shape.positions)}`)
    .join('|');
  const referenceRef = useLatest(referenceShapes);
  const drawnReferences = useRef<{ polygon: L.Polygon; label: string }[]>([]);
  useEffect(() => {
    if (!map) return;
    const color = cssVar('--muted-foreground');
    const polygons = referenceRef.current.map((shape) => ({
      label: shape.label,
      polygon: L.polygon(shape.positions.map(toLatLng), {
        color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 2,
        // No interactivo: un toque sobre una vecina sigue agregando el vértice.
        interactive: false,
      }).bindTooltip(shape.label, {
        permanent: true,
        direction: 'center',
        className: 'map-plot-label',
      }),
    }));
    drawnReferences.current = polygons;
    const layer = L.layerGroup(polygons.map(({ polygon }) => polygon)).addTo(
      map,
    );
    return () => {
      layer.remove();
      drawnReferences.current = [];
    };
  }, [map, referenceKey, referenceRef]);

  // El nombre de una vecina solo se muestra donde cabe: con el mapa alejado se apilarían.
  useShapeLabelVisibility(map, () => drawnReferences.current, referenceKey);

  const overlapKey = overlapRegions
    .map((region) => pointsKey(region))
    .join('|');
  const overlapRef = useLatest(overlapRegions);
  useEffect(() => {
    if (!map) return;
    const color = cssVar('--err-solid');
    const layer = L.layerGroup(
      overlapRef.current.map((region) =>
        L.polygon(region.map(toLatLng), {
          color,
          fillColor: color,
          fillOpacity: 0.5,
          weight: 2,
          interactive: false,
        }),
      ),
    ).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, overlapKey, overlapRef]);

  const suggestionKey = suggestion ? pointsKey(suggestion) : '';
  const suggestionRef = useLatest(suggestion);
  useEffect(() => {
    const preview = suggestionRef.current;
    if (!map || !preview) return;
    const color = cssVar('--info-solid');
    const layer = L.polygon(preview.map(toLatLng), {
      color,
      fillColor: color,
      fillOpacity: 0.15,
      weight: 3,
      dashArray: '8 6',
      interactive: false,
    }).addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, suggestionKey, suggestionRef]);

  useGpsPosition(map, gpsPosition);

  // El contorno propio: polígono con tres vértices o más, línea con dos.
  const outlineKey = pointsKey(vertices);
  const flaggedRef = useLatest(flaggedVertices);
  const flaggedKey = flaggedVertices.join(',');
  useEffect(() => {
    if (!map || vertices.length < 2) return;
    const color = cssVar('--ok-solid');
    const latLngs = verticesRef.current.map(toLatLng);
    const layer =
      latLngs.length >= 3
        ? L.polygon(latLngs, {
            color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 3,
            interactive: false,
          })
        : L.polyline(latLngs, { color, weight: 3, interactive: false });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
    // `outlineKey` resume los vértices: se rehace solo cuando cambia alguno.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, outlineKey, verticesRef]);

  // Un marcador arrastrable por vértice, con su número. Al soltarlo, `onMoveVertex` decide dónde
  // queda; el mapa lo vuelve a dibujar donde digan los vértices.
  const markersRef = useRef<L.Marker[]>([]);
  useEffect(() => {
    if (!map) return;
    const markers = verticesRef.current.map((point, index) => {
      const marker = L.marker(toLatLng(point), {
        draggable: !disabledRef.current,
        icon: vertexIcon(index + 1, flaggedRef.current.includes(index)),
        title: flaggedRef.current.includes(index)
          ? `Vértice ${index + 1}: tiene un problema (arrástralo para moverlo)`
          : `Vértice ${index + 1} (arrástralo para moverlo)`,
        alt: `Vértice ${index + 1}`,
        keyboard: false,
      }).addTo(map);
      // Sin un oyente de clic propio, Leaflet deja pasar el clic al mapa y tocar un vértice agregaba
      // otro encima. Con él, el marcador lo recibe y ahí termina.
      marker.on('click', (event) => L.DomEvent.stopPropagation(event));
      marker.on('dragend', () => {
        onMoveRef.current(index, toGeoPoint(marker.getLatLng()));
      });
      return marker;
    });
    markersRef.current = markers;
    return () => {
      markers.forEach((marker) => marker.remove());
    };
  }, [
    map,
    outlineKey,
    flaggedKey,
    flaggedRef,
    verticesRef,
    disabledRef,
    onMoveRef,
  ]);

  useEffect(() => {
    markersRef.current.forEach((marker) => {
      if (disabled) marker.dragging?.disable();
      else marker.dragging?.enable();
    });
  }, [disabled, outlineKey]);

  // Se encuadra una sola vez, al abrir: el polígono si ya existe; si no, la finca y sus vecinas.
  const framedRef = useRef(false);
  useEffect(() => {
    if (!map || framedRef.current) return;
    framedRef.current = true;
    const points: GeoPoint[] = [
      ...verticesRef.current,
      ...(verticesRef.current.length ? [] : farmPoint ? [farmPoint] : []),
      ...referenceRef.current.flatMap((shape) => shape.positions),
    ];
    if (points.length === 1) {
      map.setView(toLatLng(points[0]), POINT_ZOOM);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map(toLatLng)), {
        padding: [32, 32],
        maxZoom: MAX_FIT_ZOOM,
      });
    }
  }, [map, farmPoint, verticesRef, referenceRef]);

  // Un pedido de ir a la finca o a la posición del GPS. No se aleja si ya se está más cerca.
  const farmPointRef = useLatest(farmPoint);
  const gpsPositionRef = useLatest(gpsPosition);
  useEffect(() => {
    if (!map || !focus) return;
    const target =
      focus.target === 'farm'
        ? farmPointRef.current
        : (gpsPositionRef.current?.point ?? null);
    if (!target) return;
    map.setView(toLatLng(target), Math.max(map.getZoom(), POINT_ZOOM + 2));
  }, [map, focus, farmPointRef, gpsPositionRef]);

  // Un vértice nuevo (p. ej. capturado por GPS) puede quedar fuera de la vista: se le sigue.
  const countRef = useRef(vertices.length);
  useEffect(() => {
    const grew = vertices.length > countRef.current;
    countRef.current = vertices.length;
    const last = vertices.at(-1);
    if (!map || !grew || !last) return;
    if (!map.getBounds().contains(toLatLng(last))) map.panTo(toLatLng(last));
  }, [map, vertices]);

  return <div className="h-full w-full" ref={containerRef} />;
}
