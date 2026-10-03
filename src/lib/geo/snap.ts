import distance from '@turf/distance';
import { lineString, point as turfPoint } from '@turf/helpers';
import nearestPointOnLine from '@turf/nearest-point-on-line';

import type { GeoPoint } from '@/types/geo';

import { fromPosition, toPosition } from './polygon';

// A menos de esto de un borde o de un vértice de otra parcela, el vértice que se suelta se pega
// a él: así dos parcelas vecinas comparten el lindero exacto en vez de pisarse unos centímetros.
export const SNAP_DISTANCE_METRES = 3;

const metresBetween = (a: GeoPoint, b: GeoPoint) =>
  distance(turfPoint(toPosition(a)), turfPoint(toPosition(b)), {
    units: 'meters',
  });

// El punto, o el vértice más cercano de las otras parcelas si hay uno a menos de la distancia
// de pegado; si no, el punto más cercano de sus bordes si hay uno; si no, el mismo punto.
export function snapToBorders(
  target: GeoPoint,
  borders: readonly (readonly GeoPoint[])[],
  threshold = SNAP_DISTANCE_METRES,
): GeoPoint {
  let nearestVertex: { point: GeoPoint; metres: number } | null = null;
  let nearestEdge: { point: GeoPoint; metres: number } | null = null;

  for (const border of borders) {
    if (border.length < 2) continue;
    for (const vertex of border) {
      const metres = metresBetween(target, vertex);
      if (
        metres <= threshold &&
        (!nearestVertex || metres < nearestVertex.metres)
      ) {
        nearestVertex = { point: vertex, metres };
      }
    }
    const ring = border.map(toPosition);
    const edge = nearestPointOnLine(
      lineString([...ring, ring[0]]),
      turfPoint(toPosition(target)),
      {
        units: 'meters',
      },
    );
    const metres = edge.properties.dist ?? Infinity;
    if (metres <= threshold && (!nearestEdge || metres < nearestEdge.metres)) {
      nearestEdge = { point: fromPosition(edge.geometry.coordinates), metres };
    }
  }

  return nearestVertex?.point ?? nearestEdge?.point ?? target;
}
