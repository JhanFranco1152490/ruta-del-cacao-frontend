import type { GeoBounds, GeoPoint } from '@/types/geo';

import { boundsContain } from './operating-area';
import {
  type MultiPolygonCoordinates,
  multiPolygonContains,
  type PolygonCoordinates,
} from './point-in-polygon';

type MunicipalityFeature = {
  type: 'Feature';
  // [oeste, sur, este, norte], el orden que define GeoJSON.
  bbox: readonly [number, number, number, number];
  // Código DIVIPOLA de 5 dígitos, el mismo del catálogo de municipios de la API.
  properties: { code: string };
  geometry:
    | { type: 'Polygon'; coordinates: PolygonCoordinates }
    | { type: 'MultiPolygon'; coordinates: MultiPolygonCoordinates };
};

export type MunicipalityCollection = {
  type: 'FeatureCollection';
  features: readonly MunicipalityFeature[];
};

export type MunicipalityGeometry = {
  boundsOf: (code: string) => GeoBounds | null;
  // `null` fuera de los municipios del departamento.
  municipalityAt: (point: GeoPoint) => string | null;
};

const toBounds = ([
  west,
  south,
  east,
  north,
]: MunicipalityFeature['bbox']): GeoBounds => ({
  south,
  west,
  north,
  east,
});

const polygonsOf = ({
  geometry,
}: MunicipalityFeature): MultiPolygonCoordinates =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

export function createMunicipalityGeometry(
  collection: MunicipalityCollection,
): MunicipalityGeometry {
  const municipalities = collection.features.map((feature) => ({
    code: feature.properties.code,
    bounds: toBounds(feature.bbox),
    polygons: polygonsOf(feature),
  }));
  const byCode = new Map(municipalities.map((entry) => [entry.code, entry]));

  return {
    boundsOf: (code) => byCode.get(code)?.bounds ?? null,
    // El rectángulo descarta casi todos los municipios antes de recorrer sus polígonos.
    municipalityAt: (point) =>
      municipalities.find(
        ({ bounds, polygons }) =>
          boundsContain(bounds, point) && multiPolygonContains(polygons, point),
      )?.code ?? null,
  };
}

// Una sola carga compartida. Si falla (p. ej. sin conexión antes de tener el archivo), se
// olvida para que la siguiente llamada vuelva a intentar.
export function createGeometryLoader(
  importCollection: () => Promise<MunicipalityCollection>,
) {
  let loading: Promise<MunicipalityGeometry> | null = null;
  return () => {
    loading ??= importCollection()
      .then(createMunicipalityGeometry)
      .catch((error: unknown) => {
        loading = null;
        throw error;
      });
    return loading;
  };
}

// Los contornos pesan cerca de 250 KB: se descargan solo en las pantallas que los usan.
export const loadMunicipalityGeometry = createGeometryLoader(() =>
  import('./norte-de-santander-municipalities.json').then(
    (module) => module.default as unknown as MunicipalityCollection,
  ),
);
