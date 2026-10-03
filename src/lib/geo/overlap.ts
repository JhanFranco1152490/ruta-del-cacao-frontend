import intersect from '@turf/intersect';
import { featureCollection, polygon } from '@turf/helpers';

import type { GeoPoint } from '@/types/geo';

import { geometryAreaSquareMetres, squareMetresToHectares } from './area';
import { fromPosition, toPolygon } from './polygon';

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

// Los contornos de las zonas invadidas, para resaltarlas en el mapa: una por cada pedazo de
// intersección que pasa de la tolerancia.
export function overlapRegions(
  points: readonly GeoPoint[],
  neighbours: readonly Neighbour[],
): GeoPoint[][] {
  const own = toPolygon(points);
  return neighbours.flatMap((neighbour) => {
    const shared = intersect(
      featureCollection([own, toPolygon(neighbour.points)]),
    );
    if (!shared) return [];
    const pieces =
      shared.geometry.type === 'Polygon'
        ? [shared.geometry.coordinates]
        : shared.geometry.coordinates;
    return pieces
      .filter(
        ([outline]) => polygonArea(outline) >= OVERLAP_TOLERANCE_SQUARE_METRES,
      )
      .map(([outline]) => outline.slice(0, -1).map(fromPosition));
  });
}

const polygonArea = (outline: number[][]) =>
  geometryAreaSquareMetres(polygon([outline]));
