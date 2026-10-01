import type { Coordinates, GeoPoint } from '@/types/geo';

// La API guarda las coordenadas con siete decimales (~1 cm) y rechaza más precisión, que el
// GPS de algunos navegadores y los mapas sí entregan.
export const COORDINATE_DECIMALS = 7;

export const formatGeoPoint = ({
  latitude,
  longitude,
}: GeoPoint): Coordinates => ({
  latitude: latitude.toFixed(COORDINATE_DECIMALS),
  longitude: longitude.toFixed(COORDINATE_DECIMALS),
});

const DECIMAL = /^-?\d+(\.\d+)?$/;

// Lo que la persona escribió, como punto de mapa, solo si es un punto posible: mientras
// escribe ("7.", "-") o con un valor fuera de rango no hay marcador que mostrar.
export function parseCoordinates(coordinates: Coordinates): GeoPoint | null {
  const latitudeText = coordinates.latitude.trim().replace(',', '.');
  const longitudeText = coordinates.longitude.trim().replace(',', '.');
  if (!DECIMAL.test(latitudeText) || !DECIMAL.test(longitudeText)) return null;

  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}
