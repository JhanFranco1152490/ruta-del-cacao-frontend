import difference from '@turf/difference';
import { featureCollection, polygon } from '@turf/helpers';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { GeoPoint } from '@/types/geo';

import { geometryAreaSquareMetres } from './area';
import { OVERLAP_TOLERANCE_SQUARE_METRES } from './overlap';
import { fromPosition, toPolygon } from './polygon';
import { polygonProblem } from './validate';

// El servidor guarda las coordenadas con siete decimales: la sugerencia usa los mismos para que
// los vértices que ya existían se reconozcan y los nuevos no difieran del redondeo del servidor.
const COORDINATE_DECIMALS = 7;

export type SuggestedVertex = {
  point: GeoPoint;
  // Un vértice nuevo (en el borde de la vecina o donde se cruzan los bordes), no uno que la
  // persona ya había puesto.
  isAdjusted: boolean;
};

const round = (value: number) => Number(value.toFixed(COORDINATE_DECIMALS));
const key = ({ latitude, longitude }: GeoPoint) => `${latitude},${longitude}`;

const polygonsOf = (
  geometry: Feature<Polygon | MultiPolygon>,
): number[][][][] =>
  geometry.geometry.type === 'Polygon'
    ? [geometry.geometry.coordinates]
    : geometry.geometry.coordinates;

const ringArea = (ring: number[][]) =>
  geometryAreaSquareMetres(polygon([ring]));

// El contorno propio sin la parte que cae dentro de las vecinas, o null si no queda un solo
// polígono sin huecos que sugerir (la parcela queda entera dentro de otra, o el recorte la parte
// en varios pedazos o le abre un hueco). Los vértices que ya estaban conservan su lugar; los
// nuevos se marcan como ajustados.
export function suggestAdjustment(
  points: readonly GeoPoint[],
  neighbours: readonly (readonly GeoPoint[])[],
): SuggestedVertex[] | null {
  let remainder: Feature<Polygon | MultiPolygon> | null = toPolygon(points);
  for (const neighbour of neighbours) {
    if (!remainder) return null;
    remainder = difference(
      featureCollection([remainder, toPolygon(neighbour)]),
    );
  }
  if (!remainder) return null;

  const pieces = polygonsOf(remainder).filter(
    ([outline]) => ringArea(outline) >= OVERLAP_TOLERANCE_SQUARE_METRES,
  );
  if (pieces.length !== 1) return null;
  const [outline, ...holes] = pieces[0];
  if (holes.some((hole) => ringArea(hole) >= OVERLAP_TOLERANCE_SQUARE_METRES)) {
    return null;
  }

  const original = new Set(
    points.map((point) =>
      key({
        latitude: round(point.latitude),
        longitude: round(point.longitude),
      }),
    ),
  );
  const suggestion: SuggestedVertex[] = [];
  for (const position of outline.slice(0, -1)) {
    const { latitude, longitude } = fromPosition(position);
    const point = { latitude: round(latitude), longitude: round(longitude) };
    const previous = suggestion.at(-1);
    if (previous && key(previous.point) === key(point)) continue;
    suggestion.push({ point, isAdjusted: !original.has(key(point)) });
  }
  if (
    suggestion.length > 1 &&
    key(suggestion[0].point) === key(suggestion.at(-1)!.point)
  ) {
    suggestion.pop();
  }

  // Al redondear, un recorte muy fino puede quedar mal formado: es mejor no sugerir nada que
  // sugerir un polígono que el propio servidor rechazaría.
  return polygonProblem(suggestion.map(({ point }) => point))
    ? null
    : suggestion;
}
