import { polygon } from '@turf/helpers';
import type { Feature, Polygon } from 'geojson';

import type { GeoPoint } from '@/types/geo';

export const MIN_VERTICES = 3;
export const MAX_VERTICES = 100;

// Los vértices de una parcela van en orden y sin repetir el primero al final, como los guarda
// la API. GeoJSON los quiere como [longitud, latitud] y con el anillo cerrado.
export const toPosition = ({ latitude, longitude }: GeoPoint): number[] => [
  longitude,
  latitude,
];

export const fromPosition = ([longitude, latitude]: number[]): GeoPoint => ({
  latitude,
  longitude,
});

export function toPolygon(points: readonly GeoPoint[]): Feature<Polygon> {
  const ring = points.map(toPosition);
  return polygon([[...ring, ring[0]]]);
}
