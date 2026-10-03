import type { GeoPoint } from '@/types/geo';

import type { MultiPolygonCoordinates } from './point-in-polygon';

// Centroide del contorno exterior más grande, ponderado por área: donde va la cifra de un
// municipio. Con los contornos actuales cae dentro de cada uno; una prueba lo vigila por si un
// marco geográfico nuevo trae una forma en la que no.
export function labelPointOf(polygons: MultiPolygonCoordinates): GeoPoint {
  let best = { area: 0, latitude: 0, longitude: 0 };
  for (const [outline] of polygons) {
    if (!outline) continue;
    let doubleArea = 0;
    let x = 0;
    let y = 0;
    for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
      const [xi, yi] = outline[i];
      const [xj, yj] = outline[j];
      const cross = xj * yi - xi * yj;
      doubleArea += cross;
      x += (xj + xi) * cross;
      y += (yj + yi) * cross;
    }
    if (Math.abs(doubleArea) > best.area) {
      best = {
        area: Math.abs(doubleArea),
        latitude: y / (3 * doubleArea),
        longitude: x / (3 * doubleArea),
      };
    }
  }
  return { latitude: best.latitude, longitude: best.longitude };
}
