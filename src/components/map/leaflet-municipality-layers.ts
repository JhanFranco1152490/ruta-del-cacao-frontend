import L from 'leaflet';

import type { MunicipalityOutline } from '@/lib/geo/municipality-geometry';
import type { GeoBounds } from '@/types/geo';

import { cssVar, toLatLng } from './leaflet-shared';
import { levelOf } from './map-levels';
import type { MunicipalityCount } from './map-provider';

export const toLatLngBounds = (bounds: GeoBounds) =>
  L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);

// GeoJSON guarda [longitud, latitud]; Leaflet pide [latitud, longitud].
const toRings = (outline: MunicipalityOutline) =>
  outline.polygons.map((polygon) =>
    polygon.map((ring) =>
      ring.map(([longitude, latitude]) => L.latLng(latitude, longitude)),
    ),
  );

// Texto como nodo y no como HTML armado con texto.
function textNode(text: string) {
  const node = document.createElement('span');
  node.textContent = text;
  return node;
}

// El tamaño de la cifra sigue al del municipio en pantalla: con el mapa alejado, un municipio
// pequeño solo lleva un punto de color (la cantidad está en su texto al pasar por encima), y al
// acercar crece hasta el tamaño normal. Así los municipios vecinos no se tapan entre sí.
const COUNT_MAX_PX = 30;
const COUNT_MIN_PX = 18;
const COUNT_NUMBER_MIN_PX = 18;

const countIcon = (count: number, size: number) =>
  L.divIcon({
    className: '',
    html: `<span class="map-count" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.43)}px;border-width:${size < COUNT_NUMBER_MIN_PX ? 1 : 2}px">${size >= COUNT_NUMBER_MIN_PX ? count : ''}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

function countSize(map: L.Map, outline: MunicipalityOutline) {
  const bounds = toLatLngBounds(outline.bounds);
  const southWest = map.latLngToContainerPoint(bounds.getSouthWest());
  const northEast = map.latLngToContainerPoint(bounds.getNorthEast());
  const room = Math.min(
    Math.abs(northEast.x - southWest.x),
    Math.abs(southWest.y - northEast.y),
  );
  return Math.round(
    Math.min(COUNT_MAX_PX, Math.max(COUNT_MIN_PX, room * 0.85)),
  );
}

// Nivel del departamento: cada municipio con el tono de su cantidad de fincas y la cifra encima.
export function departmentLayer(
  map: L.Map,
  outlines: readonly MunicipalityOutline[],
  counts: readonly MunicipalityCount[],
  {
    describe,
    onSelect,
  }: {
    describe: (code: string, count: number) => string;
    onSelect: (code: string) => void;
  },
) {
  const byCode = new Map(counts.map(({ code, count }) => [code, count]));
  const max = Math.max(0, ...byCode.values());
  const group = L.layerGroup();
  for (const outline of outlines) {
    const count = byCode.get(outline.code) ?? 0;
    L.polygon(toRings(outline), {
      color: cssVar('--card'),
      weight: 1.5,
      fillColor: cssVar(`--map-level-${levelOf(count, max)}`),
      fillOpacity: 1,
    })
      .bindTooltip(textNode(describe(outline.code, count)), { sticky: true })
      .on('click', () => onSelect(outline.code))
      .addTo(group);
  }
  const badges = L.layerGroup().addTo(group);
  const drawBadges = () => {
    badges.clearLayers();
    for (const outline of outlines) {
      const count = byCode.get(outline.code) ?? 0;
      if (count === 0) continue;
      L.marker(toLatLng(outline.labelPoint), {
        icon: countIcon(count, countSize(map, outline)),
        interactive: false,
        keyboard: false,
      }).addTo(badges);
    }
  };
  drawBadges();
  map.on('zoomend', drawBadges);
  group.on('remove', () => {
    map.off('zoomend', drawBadges);
  });
  return group;
}

const WORLD = [
  L.latLng(-89, -179),
  L.latLng(-89, 179),
  L.latLng(89, 179),
  L.latLng(89, -179),
];

// Nivel del municipio: su contorno y una máscara que cubre todo lo demás, para que el mapa base
// solo se vea adentro.
export function municipalityLayer(outline: MunicipalityOutline) {
  const rings = toRings(outline);
  return L.layerGroup([
    L.polygon([WORLD, ...rings.map(([outer]) => outer)], {
      stroke: false,
      fillColor: cssVar('--map-mask'),
      fillOpacity: 0.92,
      interactive: false,
    }),
    L.polygon(rings, {
      color: cssVar('--selva'),
      weight: 3,
      fill: false,
      interactive: false,
    }),
  ]);
}

// Mapa libre: los límites de los municipios como una línea tenue, solo para orientarse.
export function outlinesLayer(outlines: readonly MunicipalityOutline[]) {
  return L.layerGroup(
    outlines.map((outline) =>
      L.polygon(toRings(outline), {
        color: cssVar('--selva'),
        weight: 1,
        opacity: 0.35,
        fill: false,
        interactive: false,
      }),
    ),
  );
}
