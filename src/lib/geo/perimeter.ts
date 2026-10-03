import length from '@turf/length';
import { lineString } from '@turf/helpers';

import type { GeoPoint } from '@/types/geo';

import { toPosition } from './polygon';

// Solo se muestra mientras se dibuja: el servidor no lo guarda. Con menos de dos vértices no hay
// lados; con dos, el perímetro es la ida y la vuelta del único segmento.
export function polygonPerimeterMetres(points: readonly GeoPoint[]): number {
  if (points.length < 2) return 0;
  const ring = points.map(toPosition);
  return length(lineString([...ring, ring[0]]), { units: 'meters' });
}
