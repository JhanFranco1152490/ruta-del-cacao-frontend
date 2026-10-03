import type {
  MapPoint,
  MunicipalityCount,
} from '@/components/map/map-provider';
import { parseCoordinates } from '@/lib/format/coordinates';

import { FARM_STATUS_DISPLAY } from './components/farm-status-badge';
import type { FarmListItem } from './farm-list-item';
import type { FarmMapPoint, FarmMunicipalityCount } from './map-api';

// Las altas que siguen en el dispositivo todavía no existen en el servidor, así que se suman a
// su municipio. Una edición pendiente ya está contada; si mueve la finca de municipio, el conteo
// se corrige al sincronizar.
export function withLocalCounts(
  server: readonly FarmMunicipalityCount[],
  local: readonly FarmListItem[],
): MunicipalityCount[] {
  const counts = new Map(
    server.map(({ municipality_id, farm_count }) => [
      municipality_id,
      farm_count,
    ]),
  );
  for (const farm of local) {
    if (farm.queuedAs !== 'create') continue;
    counts.set(
      farm.municipalityCode,
      (counts.get(farm.municipalityCode) ?? 0) + 1,
    );
  }
  return [...counts]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

// Lo del dispositivo va primero y reemplaza a su copia del servidor, también si la edición
// pendiente la sacó de este municipio. Sin municipio (mapa libre) entra todo lo del dispositivo.
export function farmMapPoints(
  server: readonly FarmMapPoint[],
  local: readonly FarmListItem[],
  municipality: string | null,
  { showProducer }: { showProducer: boolean },
): MapPoint[] {
  const localIds = new Set(local.map((farm) => farm.id));
  const fromDevice = local
    .filter((farm) => !municipality || farm.municipalityCode === municipality)
    .flatMap((farm) => {
      const position = parseCoordinates(farm.location);
      if (!position) return [];
      const { label, tone } = FARM_STATUS_DISPLAY[farm.status];
      return [{ id: farm.id, label: farm.name, detail: label, position, tone }];
    });
  const fromServer = server
    .filter((point) => !localIds.has(point.id))
    .flatMap((point) => {
      const position = parseCoordinates(point.location);
      if (!position) return [];
      const { label, tone } =
        FARM_STATUS_DISPLAY[point.is_active ? 'active' : 'inactive'];
      const producer = `${point.producer.first_name} ${point.producer.last_name}`;
      return [
        {
          id: point.id,
          label: point.name,
          detail: showProducer ? `${label} · ${producer}` : label,
          position,
          tone,
        },
      ];
    });
  return [...fromDevice, ...fromServer];
}
