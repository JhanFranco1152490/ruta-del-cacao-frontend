import type { QueueItem } from '@/lib/offline/db';
import type { Coordinates } from '@/types/geo';

import type { FarmDisplayStatus } from './components/farm-status-badge';
import type { FarmCreatePayload } from './farm-queue';

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
  errorMessage?: string;
};

export function queuedFarmToListItem(item: QueueItem): FarmListItem {
  // La cola de fincas solo la escribe enqueueFarmCreate, siempre con esta forma.
  const payload = item.payload as FarmCreatePayload;
  return {
    id: payload.id,
    name: payload.name,
    municipalityCode: payload.municipality_id,
    details: payload.details,
    areaHectares: payload.area_hectares,
    location: { latitude: payload.latitude, longitude: payload.longitude },
    status: item.status === 'error' ? 'error' : 'pending',
    errorMessage: item.errorMessage,
  };
}

export const byFarmName = (a: FarmListItem, b: FarmListItem) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
