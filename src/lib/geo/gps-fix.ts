// Una lectura del GPS: el punto y los metros de error que reporta el dispositivo (Infinity si no
// los informa).
export type GpsReading = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

// Se promedian las lecturas que no son peores que el doble de la mejor: más allá, la lectura
// viene de otra fuente (wifi, antenas) y arrastraría el promedio.
export const AVERAGING_WINDOW = 2;

// Una lectura nueva cuenta como mejora si baja el error al menos un 10 %: las que mejoran un par
// de metros no justifican seguir esperando.
export const MIN_IMPROVEMENT_RATIO = 0.9;

export const improvesAccuracy = (best: number | null, next: number) =>
  best === null || next < best * MIN_IMPROVEMENT_RATIO;

// La mejor posición que dan las lecturas hasta ahora. Con el dispositivo quieto, el error de cada
// lectura es en buena parte aleatorio: el promedio ponderado por 1/error² de las mejores cae más
// cerca del punto real que cualquiera de ellas. El error que se informa es el de la mejor lectura:
// no se promete más precisión de la que el dispositivo declaró.
export function bestFix(readings: readonly GpsReading[]): GpsReading | null {
  if (readings.length === 0) return null;
  const best = readings.reduce((a, b) => (b.accuracy < a.accuracy ? b : a));
  // Sin error informado no hay con qué ponderar: se usa esa lectura tal cual.
  if (!Number.isFinite(best.accuracy) || best.accuracy <= 0) return best;

  const close = readings.filter(
    (reading) => reading.accuracy <= best.accuracy * AVERAGING_WINDOW,
  );
  let weightSum = 0;
  let latitude = 0;
  let longitude = 0;
  for (const reading of close) {
    const weight = 1 / reading.accuracy ** 2;
    weightSum += weight;
    latitude += reading.latitude * weight;
    longitude += reading.longitude * weight;
  }
  return {
    latitude: latitude / weightSum,
    longitude: longitude / weightSum,
    accuracy: best.accuracy,
  };
}
