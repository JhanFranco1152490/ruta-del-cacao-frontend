'use client';

import { useEffect, useState } from 'react';

import {
  loadMunicipalityGeometry,
  type MunicipalityGeometry,
} from '@/lib/geo/municipality-geometry';

// Los contornos de los municipios, o null mientras cargan o si no se pudieron cargar. Quien
// los usa para algo opcional (advertir, sugerir, centrar) simplemente lo omite sin ellos.
export function useMunicipalityGeometry() {
  const [geometry, setGeometry] = useState<MunicipalityGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMunicipalityGeometry().then(
      (loaded) => {
        if (!cancelled) setGeometry(loaded);
      },
      () => {
        // Sin contornos no hay advertencia de municipio; el formulario sigue igual.
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return geometry;
}
