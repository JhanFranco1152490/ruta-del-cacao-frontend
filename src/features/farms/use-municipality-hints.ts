'use client';

import { useMunicipalityGeometry } from '@/hooks/use-municipality-geometry';
import { parseCoordinates } from '@/lib/format/coordinates';
import { boundsContain, OPERATING_AREA_BOUNDS } from '@/lib/geo/operating-area';
import type { Coordinates } from '@/types/geo';

// Lo que el formulario deduce de los contornos de los municipios. Sin contornos (cargando o
// sin conexión antes de tenerlos) no deduce nada y el formulario funciona igual.
export function useMunicipalityHints(
  location: Coordinates,
  municipalityId: string,
) {
  const geometry = useMunicipalityGeometry();

  const municipalityAt = (coordinates: Coordinates) => {
    const point = parseCoordinates(coordinates);
    return geometry && point && boundsContain(OPERATING_AREA_BOUNDS, point)
      ? geometry.municipalityAt(point)
      : null;
  };

  const hasPoint = parseCoordinates(location) !== null;
  const pointMunicipality = municipalityAt(location);

  return {
    municipalityAt,
    // El mapa encuadra el municipio elegido solo mientras no hay punto: nunca mueve el que la
    // persona ya puso.
    focusBounds:
      !hasPoint && geometry && municipalityId
        ? geometry.boundsOf(municipalityId)
        : null,
    // El punto cae en un municipio distinto del elegido (advertencia, no bloqueo).
    mismatch:
      pointMunicipality &&
      municipalityId &&
      pointMunicipality !== municipalityId
        ? pointMunicipality
        : null,
  };
}
