import altitudes from './municipality-altitude.json';

// Altitud mínima y máxima (m s. n. m.) de cada municipio de Norte de Santander, calculada
// muestreando una malla dentro de su contorno sobre un modelo digital de elevación de 30 m
// (SRTM). Es el rango del terreno del municipio, no la altitud de su cabecera: un municipio
// puede ir de la llanura a la montaña.
const ALTITUDE_RANGES = altitudes as unknown as Record<
  string,
  [number, number]
>;

// El muestreo es una malla y el modelo tiene sus errores: sin este margen se rechazaría una finca
// legítima en el borde del rango.
export const ALTITUDE_MARGIN_M = 100;

export type AltitudeRange = { minimum: number; maximum: number };

// El rango que se acepta para una finca de ese municipio, con el margen ya aplicado; null si no
// se conoce el municipio (entonces solo vale el rango general del formulario).
export function altitudeRangeFor(
  municipalityCode: string,
): AltitudeRange | null {
  const range = ALTITUDE_RANGES[municipalityCode];
  if (!range) return null;
  return {
    // Con el margen el mínimo puede quedar bajo el nivel del mar, y Norte de Santander no tiene
    // terreno ahí: decir "de -49 a 1647 m" confunde.
    minimum: Math.max(0, range[0] - ALTITUDE_MARGIN_M),
    maximum: range[1] + ALTITUDE_MARGIN_M,
  };
}
