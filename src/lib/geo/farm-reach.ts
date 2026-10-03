import distance from '@turf/distance';
import { point as turfPoint } from '@turf/helpers';

import type { GeoPoint } from '@/types/geo';

import { toPosition } from './polygon';

// Los vértices de una parcela no pueden quedar lejos del punto de su finca: el punto es la casa o
// la entrada, y la parcela es parte de la finca. El límite sale del área: el doble del radio de
// una finca circular de esa área (el punto puede estar en un extremo) y un margen para las que
// no son redondas. Los mismos números valida el servidor.
export const FARM_REACH_MARGIN_METRES = 300;
const SQUARE_METRES_PER_HECTARE = 10_000;

export const maxDistanceFromFarmMetres = (farmAreaHectares: number) =>
  Math.round(
    2 * Math.sqrt((farmAreaHectares * SQUARE_METRES_PER_HECTARE) / Math.PI) +
      FARM_REACH_MARGIN_METRES,
  );

export type FarVertex = {
  // Posición del vértice en la lista (desde 0).
  index: number;
  distanceMetres: number;
};

// Los vértices que pasan del límite, con su distancia al punto de la finca.
export function verticesTooFarFromFarm(
  vertices: readonly GeoPoint[],
  farmPoint: GeoPoint,
  farmAreaHectares: number,
): FarVertex[] {
  const limit = maxDistanceFromFarmMetres(farmAreaHectares);
  const origin = turfPoint(toPosition(farmPoint));
  return vertices.flatMap((vertex, index) => {
    const distanceMetres = distance(origin, turfPoint(toPosition(vertex)), {
      units: 'meters',
    });
    return distanceMetres > limit
      ? [{ index, distanceMetres: Math.round(distanceMetres) }]
      : [];
  });
}
