import type { GeoBounds, GeoPoint } from '@/types/geo';

// Rectángulo que encierra Norte de Santander según el Marco Geoestadístico 2025 del DANE,
// redondeado hacia afuera a tres decimales. El backend valida las coordenadas con los mismos
// cuatro números: si cambian aquí, cambian allá.
export const OPERATING_AREA_BOUNDS: GeoBounds = {
  south: 6.872,
  west: -73.634,
  north: 9.291,
  east: -72.047,
};

export const boundsContain = (bounds: GeoBounds, point: GeoPoint) =>
  point.latitude >= bounds.south &&
  point.latitude <= bounds.north &&
  point.longitude >= bounds.west &&
  point.longitude <= bounds.east;
