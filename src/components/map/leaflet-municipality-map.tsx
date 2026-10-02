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
  outlinesLayer,
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
// Al encuadrar varias fincas del mapa libre: cerca, sin perder las veredas vecinas.
const FIT_MAX_ZOOM = 14;
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

// El departamento por municipios se ve completo y quieto. Un municipio, o el mapa libre,
// permiten acercar y arrastrar sin salir de él o del departamento.
function frame(
  map: L.Map,
  zoom: L.Control.Zoom,
  target: MunicipalityOutline | 'department' | 'free',
) {
  map.setMaxBounds(undefined);
  map.setMinZoom(0);
  map.setMaxZoom(MAX_ZOOM);
  const bounds = toLatLngBounds(
    typeof target === 'string' ? OPERATING_AREA_BOUNDS : target.bounds,
  );
  map.fitBounds(bounds, { animate: false, padding: [12, 12] });
  const interactive = target !== 'department';
  for (const name of INTERACTIONS) {
    if (interactive) map[name].enable();
    else map[name].disable();
  }
  if (!interactive) {
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
  const { containerRef, map } = useLeafletMap({
    zoomControl: false,
    zoomSnap: 0.25,
  });
  const outlines = useOutlines(onError);
  const [zoom] = useState(() => L.control.zoom());
  const latest = useLatest({
    view,
    describeMunicipality,
    onSelectMunicipality,
    onSelectPoint,
  });
  const code = view.level === 'municipality' ? view.code : null;
  const free = view.level === 'free';
  const points = view.level === 'department' ? NO_POINTS : view.points;
  const focus = view.level === 'department' ? undefined : view.focus;
  const counts = countsKey(view);
  const drawn = pointsKey(points);
  // "Ver en el mapa" puede cambiar de municipio: el enfoque espera a que lleguen sus puntos.
  const focusReady =
    !!focus && points.some((point) => point.id === focus.pointId);

  useBaseLayer(map, code || free ? baseLayer : null, onBaseLayerUnavailable);

  useEffect(() => {
    if (!map || !outlines) return;
    const outline = outlines.find((item) => item.code === code);
    frame(map, zoom, outline ?? (free ? 'free' : 'department'));
    const current = latest.current.view;
    const layer = outline
      ? municipalityLayer(outline)
      : free
        ? outlinesLayer(outlines)
        : departmentLayer(
            outlines,
            current.level === 'department' ? current.counts : [],
            {
              describe: (...args) =>
                latest.current.describeMunicipality(...args),
              onSelect: (selected) =>
                latest.current.onSelectMunicipality(selected),
            },
          );
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, outlines, code, free, counts, zoom, latest]);

  useEffect(() => {
    if (!map || !outlines || (!code && !free)) return;
    const pointsNow = () => {
      const current = latest.current.view;
      return current.level === 'department' ? NO_POINTS : current.points;
    };
    // El mapa libre se encuadra en las fincas que muestra (cambian con la búsqueda y los filtros).
    const shown = pointsNow();
    if (free && shown.length) {
      map.fitBounds(
        L.latLngBounds(shown.map((point) => toLatLng(point.position))),
        { animate: false, padding: [32, 32], maxZoom: FIT_MAX_ZOOM },
      );
    }
    let layer: L.LayerGroup | null = null;
    const draw = () => {
      layer?.remove();
      layer = pointsLayer(map, pointsNow(), (id) =>
        latest.current.onSelectPoint(id),
      ).addTo(map);
    };
    draw();
    map.on('zoomend', draw);
    return () => {
      map.off('zoomend', draw);
      layer?.remove();
    };
  }, [map, outlines, code, free, drawn, latest]);

  useEffect(() => {
    if (!map || !focus || !focusReady) return;
    const current = latest.current.view;
    const point =
      current.level === 'department'
        ? undefined
        : current.points.find((item) => item.id === focus.pointId);
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

  // Sin mapa base (nivel del departamento) se ve el fondo: el tono claro del mapa, no el gris de
  // la librería.
  return (
    <div
      className="h-full w-full"
      ref={containerRef}
      style={{ background: 'var(--map-mask)' }}
    />
  );
}
