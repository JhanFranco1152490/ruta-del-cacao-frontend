'use client';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect, useState } from 'react';

import {
  loadMunicipalityGeometry,
  type MunicipalityOutline,
} from '@/lib/geo/municipality-geometry';
import { OPERATING_AREA_BOUNDS } from '@/lib/geo/operating-area';

import {
  departmentLayer,
  municipalityLayer,
  toLatLngBounds,
} from './leaflet-municipality-layers';
import { pointsLayer } from './leaflet-point-clusters';
import {
  toLatLng,
  useBaseLayer,
  useLatest,
  useLeafletMap,
} from './leaflet-shared';
import type { MapPoint, MunicipalityMapProviderProps } from './map-provider';

const MAX_ZOOM = 17;
const FOCUS_ZOOM = 15;
const INTERACTIONS = [
  'dragging',
  'touchZoom',
  'doubleClickZoom',
  'scrollWheelZoom',
  'boxZoom',
  'keyboard',
] as const;
const NO_POINTS: readonly MapPoint[] = [];

function useOutlines(onError: () => void) {
  const [outlines, setOutlines] = useState<
    readonly MunicipalityOutline[] | null
  >(null);
  const onErrorRef = useLatest(onError);
  useEffect(() => {
    let cancelled = false;
    loadMunicipalityGeometry().then(
      (geometry) => {
        if (!cancelled) setOutlines(geometry.outlines);
      },
      () => {
        if (!cancelled) onErrorRef.current();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [onErrorRef]);
  return outlines;
}

// El departamento se ve completo y quieto; un municipio permite acercar y arrastrar sin salir
// de él.
function frame(
  map: L.Map,
  zoom: L.Control.Zoom,
  outline?: MunicipalityOutline,
) {
  map.setMaxBounds(undefined);
  map.setMinZoom(0);
  map.setMaxZoom(MAX_ZOOM);
  const bounds = toLatLngBounds(outline?.bounds ?? OPERATING_AREA_BOUNDS);
  map.fitBounds(bounds, { animate: false, padding: [12, 12] });
  for (const name of INTERACTIONS) {
    if (outline) map[name].enable();
    else map[name].disable();
  }
  if (!outline) {
    zoom.remove();
    return;
  }
  map.setMinZoom(map.getZoom());
  map.setMaxBounds(bounds.pad(0.15));
  zoom.addTo(map);
}

// Firmas de lo que se dibuja: solo se rehace cuando cambia algo visible, no en cada render.
const countsKey = (view: MunicipalityMapProviderProps['view']) =>
  view.level === 'department'
    ? view.counts.map(({ code, count }) => `${code}:${count}`).join('|')
    : '';
const pointsKey = (points: readonly MapPoint[]) =>
  points
    .map(
      (point) =>
        `${point.id}:${point.tone}:${point.label}:${point.detail ?? ''}:${point.position.latitude},${point.position.longitude}`,
    )
    .join('|');

export function LeafletMunicipalityMap({
  view,
  baseLayer,
  describeMunicipality,
  onSelectMunicipality,
  onSelectPoint,
  onBaseLayerUnavailable,
  onError,
}: MunicipalityMapProviderProps) {
  const { containerRef, map } = useLeafletMap({ zoomControl: false });
  const outlines = useOutlines(onError);
  const [zoom] = useState(() => L.control.zoom());
  const latest = useLatest({
    view,
    describeMunicipality,
    onSelectMunicipality,
    onSelectPoint,
  });
  const code = view.level === 'municipality' ? view.code : null;
  const points = view.level === 'municipality' ? view.points : NO_POINTS;
  const focus = view.level === 'municipality' ? view.focus : undefined;
  const counts = countsKey(view);
  const drawn = pointsKey(points);
  // "Ver en el mapa" puede cambiar de municipio: el enfoque espera a que lleguen sus puntos.
  const focusReady =
    !!focus && points.some((point) => point.id === focus.pointId);

  useBaseLayer(map, code ? baseLayer : null, onBaseLayerUnavailable);

  useEffect(() => {
    if (!map || !outlines) return;
    const outline = outlines.find((item) => item.code === code);
    frame(map, zoom, outline);
    const current = latest.current.view;
    const layer = outline
      ? municipalityLayer(outline)
      : departmentLayer(
          outlines,
          current.level === 'department' ? current.counts : [],
          {
            describe: (...args) => latest.current.describeMunicipality(...args),
            onSelect: (selected) =>
              latest.current.onSelectMunicipality(selected),
          },
        );
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, outlines, code, counts, zoom, latest]);

  useEffect(() => {
    if (!map || !outlines || !code) return;
    let layer: L.LayerGroup | null = null;
    const draw = () => {
      layer?.remove();
      const current = latest.current.view;
      layer = pointsLayer(
        map,
        current.level === 'municipality' ? current.points : NO_POINTS,
        (id) => latest.current.onSelectPoint(id),
      ).addTo(map);
    };
    draw();
    map.on('zoomend', draw);
    return () => {
      map.off('zoomend', draw);
      layer?.remove();
    };
  }, [map, outlines, code, drawn, latest]);

  useEffect(() => {
    if (!map || !focus || !focusReady) return;
    const current = latest.current.view;
    const point =
      current.level === 'municipality'
        ? current.points.find((item) => item.id === focus.pointId)
        : undefined;
    if (!point) return;
    const position = toLatLng(point.position);
    // El anillo sigue a su coordenada mientras el mapa vuela: no hace falta esperar al final.
    const ring = L.marker(position, {
      icon: L.divIcon({
        className: '',
        html: '<span class="map-focus"></span>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
      interactive: false,
      keyboard: false,
    }).addTo(map);
    map.flyTo(position, Math.max(map.getZoom(), FOCUS_ZOOM), {
      duration: 0.6,
    });
    return () => {
      ring.remove();
    };
  }, [map, focus, focusReady, latest]);

  return <div className="h-full w-full" ref={containerRef} />;
}
