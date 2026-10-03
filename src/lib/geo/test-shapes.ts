import type { GeoPoint } from '@/types/geo';

// Cerca de 7,8° de latitud, 0,001° son unos 110 m en cada eje: los mismos rectángulos que usan
// las pruebas de geometría del servidor.
const LON = -72.5;
const LAT = 7.8;
const STEP = 0.001;

const round7 = (value: number) => Number(value.toFixed(7));

// Rectángulo en pasos de STEP a partir de (LON, LAT).
export const rect = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): GeoPoint[] => {
  const left = round7(LON + STEP * x0);
  const right = round7(LON + STEP * x1);
  const bottom = round7(LAT + STEP * y0);
  const top = round7(LAT + STEP * y1);
  return [
    { latitude: bottom, longitude: left },
    { latitude: bottom, longitude: right },
    { latitude: top, longitude: right },
    { latitude: top, longitude: left },
  ];
};

export const coordinateSet = (points: readonly GeoPoint[]) =>
  new Set(points.map(({ latitude, longitude }) => `${longitude},${latitude}`));
