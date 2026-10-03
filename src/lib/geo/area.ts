import area from '@turf/area';
import type { Feature, MultiPolygon, Polygon } from 'geojson';

import type { GeoPoint } from '@/types/geo';

import { toPolygon } from './polygon';

const SQUARE_METRES_PER_HECTARE = 10_000;
const HECTARE_DECIMALS = 4;

// La misma fórmula esférica que usa el servidor para validar: así la persona ve al dibujar
// exactamente el área que se guardará.
export const geometryAreaSquareMetres = (
  geometry: Feature<Polygon | MultiPolygon>,
) => area(geometry);

export const polygonAreaSquareMetres = (points: readonly GeoPoint[]) =>
  points.length < 3 ? 0 : area(toPolygon(points));

export const squareMetresToHectares = (squareMetres: number) =>
  Number((squareMetres / SQUARE_METRES_PER_HECTARE).toFixed(HECTARE_DECIMALS));

export const polygonAreaHectares = (points: readonly GeoPoint[]) =>
  squareMetresToHectares(polygonAreaSquareMetres(points));
