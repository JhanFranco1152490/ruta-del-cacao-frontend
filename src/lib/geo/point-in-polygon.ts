import type { GeoPoint } from '@/types/geo';

// Posiciones en el orden de GeoJSON: [longitud, latitud].
type Ring = readonly (readonly number[])[];
// El primer anillo es el contorno; los demás, huecos.
export type PolygonCoordinates = readonly Ring[];
export type MultiPolygonCoordinates = readonly PolygonCoordinates[];

// Cuenta cuántas veces una semirrecta horizontal desde el punto cruza el anillo: un número
// impar de cruces significa que está adentro.
function ringContains(ring: Ring, longitude: number, latitude: number) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function polygonContains(polygon: PolygonCoordinates, point: GeoPoint) {
  const [outline, ...holes] = polygon;
  const { longitude, latitude } = point;
  return (
    !!outline &&
    ringContains(outline, longitude, latitude) &&
    !holes.some((hole) => ringContains(hole, longitude, latitude))
  );
}

export const multiPolygonContains = (
  polygons: MultiPolygonCoordinates,
  point: GeoPoint,
) => polygons.some((polygon) => polygonContains(polygon, point));
