'use client';

import type {
  LoadPointsMapProvider,
  MapPoint,
} from '@/components/map/map-provider';
import { PointsMapPanel } from '@/components/map/points-map-panel';
import { loadPointsMapProvider as appPointsMap } from '@/config/map';
import { parseCoordinates } from '@/lib/format/coordinates';

import type { FarmListItem } from '../farm-list-item';
import { FARM_STATUS_DISPLAY } from './farm-status-badge';

export function toMapPoints(
  farms: readonly FarmListItem[],
  municipalityName: (code: string) => string,
): MapPoint[] {
  return farms.flatMap((farm) => {
    const position = parseCoordinates(farm.location);
    if (!position) return [];
    const { label, tone } = FARM_STATUS_DISPLAY[farm.status];
    return [
      {
        id: farm.id,
        label: farm.name,
        detail: `${municipalityName(farm.municipalityCode)} · ${label}`,
        position,
        tone,
      },
    ];
  });
}

// Las mismas fincas que muestra la lista (página y búsqueda actuales), sobre un mapa.
export function FarmsMap({
  farms,
  municipalityName,
  isFiltered,
  loadProvider = appPointsMap,
}: {
  farms: readonly FarmListItem[];
  municipalityName: (code: string) => string;
  isFiltered: boolean;
  // Sin proveedor configurado no se muestra el mapa: la lista basta.
  loadProvider?: LoadPointsMapProvider | null;
}) {
  if (!loadProvider) return null;

  return (
    <PointsMapPanel
      emptyMessage={
        isFiltered
          ? 'Ninguna finca de la búsqueda tiene ubicación para mostrar.'
          : 'Aún no hay fincas para mostrar en el mapa.'
      }
      label="Mapa de mis fincas"
      loadProvider={loadProvider}
      points={toMapPoints(farms, municipalityName)}
    />
  );
}
