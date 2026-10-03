import intersect from '@turf/intersect';
import { featureCollection } from '@turf/helpers';

import type { GeoPoint } from '@/types/geo';

import { geometryAreaSquareMetres, squareMetresToHectares } from './area';
import { toPolygon } from './polygon';

// Una intersección menor que esto se trata como un lindero compartido: absorbe el redondeo de
// las coordenadas y el ruido de dos dibujos que se tocan. Es la misma tolerancia del servidor.
export const OVERLAP_TOLERANCE_SQUARE_METRES = 1;

export type Neighbour = { id: string; points: readonly GeoPoint[] };

export type PolygonOverlap = { id: string; areaHectares: number };

// Las vecinas que el polígono invade, en el orden recibido, con el área invadida. Compartir un
// borde no es invadir.
export function findOverlaps(
  points: readonly GeoPoint[],
  neighbours: readonly Neighbour[],
): PolygonOverlap[] {
  const own = toPolygon(points);
  return neighbours.flatMap((neighbour) => {
    const shared = intersect(
      featureCollection([own, toPolygon(neighbour.points)]),
    );
    const squareMetres = shared ? geometryAreaSquareMetres(shared) : 0;
    return squareMetres >= OVERLAP_TOLERANCE_SQUARE_METRES
      ? [
          {
            id: neighbour.id,
            areaHectares: squareMetresToHectares(squareMetres),
          },
        ]
      : [];
  });
}
