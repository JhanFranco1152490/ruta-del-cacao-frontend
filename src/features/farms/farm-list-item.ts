import type { QueueItem, QueueOperation } from '@/lib/offline/db';
import type { Coordinates } from '@/types/geo';

import type { Farm } from './api';
import type { FarmDisplayStatus } from './components/farm-status-badge';
import type { FarmFields } from './farm-queue';

// Lo que el listado necesita de una finca, venga del servidor o de la cola del dispositivo:
// las tarjetas no dependen de la forma de la respuesta de la API.
export type FarmListItem = {
  id: string;
  name: string;
  municipalityCode: string;
  details: string;
  areaHectares: string;
  location: Coordinates;
  status: FarmDisplayStatus;
  // Solo las del servidor: con ella se activa o desactiva sin pisar un cambio ajeno.
  version?: number;
  errorMessage?: string;
  errorCode?: string;
  // Solo las de la cola: un alta todavía no existe en el servidor; una edición sí.
  queuedAs?: QueueOperation;
};

export function queuedFarmToListItem(item: QueueItem): FarmListItem {
  // La cola de fincas solo la escribe farm-queue.ts: una alta o una edición, ambas con todos
  // los datos de la finca.
  const payload = item.payload as FarmFields;
  return {
    id: item.id,
    name: payload.name,
    municipalityCode: payload.municipality_id,
    details: payload.details,
    areaHectares: payload.area_hectares,
    location: { latitude: payload.latitude, longitude: payload.longitude },
    status: item.status === 'error' ? 'error' : 'pending',
    errorMessage: item.errorMessage,
    errorCode: item.errorCode,
    queuedAs: item.operation,
  };
}

export const serverFarmToListItem = (farm: Farm): FarmListItem => ({
  id: farm.id,
  name: farm.name,
  municipalityCode: farm.municipality.id,
  details: farm.details,
  areaHectares: farm.area_hectares,
  location: farm.location,
  status: farm.is_active ? 'active' : 'inactive',
  version: farm.version,
});

export const byFarmName = (a: FarmListItem, b: FarmListItem) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
