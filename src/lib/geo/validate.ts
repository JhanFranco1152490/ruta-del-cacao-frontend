import kinks from '@turf/kinks';

import type { GeoPoint } from '@/types/geo';

import { MAX_VERTICES, MIN_VERTICES, toPolygon } from './polygon';
import { polygonAreaSquareMetres } from './area';

// Los motivos son los mismos que da el servidor en `invalid_boundary`, para que el aviso diga
// lo mismo con o sin conexión.
export type PolygonProblem =
  | 'too_few_vertices'
  | 'too_many_vertices'
  | 'repeated_vertices'
  | 'no_area'
  | 'crossing_sides';

export const POLYGON_PROBLEM_MESSAGES: Record<PolygonProblem, string> = {
  too_few_vertices: `debe tener al menos ${MIN_VERTICES} vértices`,
  too_many_vertices: `no puede tener más de ${MAX_VERTICES} vértices`,
  repeated_vertices: 'tiene vértices repetidos',
  no_area: 'no encierra ningún área',
  crossing_sides: 'sus lados se cruzan',
};

const key = ({ latitude, longitude }: GeoPoint) => `${latitude},${longitude}`;

// Lo primero que falla, o null si es un polígono simple con área. Mientras la persona dibuja
// (menos de 3 vértices) todavía no es un error: solo no se puede cerrar.
export function polygonProblem(
  points: readonly GeoPoint[],
): PolygonProblem | null {
  if (points.length < MIN_VERTICES) return 'too_few_vertices';
  if (points.length > MAX_VERTICES) return 'too_many_vertices';
  if (new Set(points.map(key)).size < points.length) {
    return 'repeated_vertices';
  }
  // Antes que el área: dos lados cruzados en forma de moño también dan área neta 0, porque sus
  // dos mitades se restan, y ese es otro error.
  if (kinks(toPolygon(points)).features.length > 0) return 'crossing_sides';
  // Tres puntos en línea recta no encierran nada y Turf los toma por un anillo válido.
  if (polygonAreaSquareMetres(points) === 0) return 'no_area';
  return null;
}
