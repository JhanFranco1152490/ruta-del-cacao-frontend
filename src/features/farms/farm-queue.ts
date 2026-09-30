import { departmentCodeOf } from '@/lib/departments';
import { getOfflineDb, type QueueStatus } from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

import type { FarmFormValues } from './schemas';

export const FARM_RESOURCE = 'farms';

// Escrito a mano mientras la API no publica el esquema de fincas: cuando exista, se reemplaza
// por el tipo generado en schema.d.ts y TypeScript señala lo que haya que ajustar.
export type FarmCreatePayload = {
  id: string;
  name: string;
  department_id: string;
  municipality_id: string;
  details: string;
  area_hectares: string;
  altitude_masl: number;
  latitude: string;
  longitude: string;
};

export const toCreatePayload = (
  id: string,
  values: FarmFormValues,
): FarmCreatePayload => ({
  id,
  name: values.name,
  department_id: departmentCodeOf(values.municipality_id),
  municipality_id: values.municipality_id,
  details: values.details,
  area_hectares: values.area_hectares,
  altitude_masl: Number(values.altitude_masl),
  latitude: values.latitude,
  longitude: values.longitude,
});

// Toda finca nueva se guarda primero en el dispositivo, con o sin conexión; la cola la envía
// cuando puede. El id lo genera el formulario una sola vez, así que guardar dos veces el mismo
// formulario no crea dos fincas.
export const enqueueFarmCreate = (
  userId: string,
  id: string,
  values: FarmFormValues,
) =>
  enqueue(userId, {
    id,
    resource: FARM_RESOURCE,
    operation: 'create',
    payload: toCreatePayload(id, values),
  });

export const toFormValues = (payload: FarmCreatePayload): FarmFormValues => ({
  name: payload.name,
  municipality_id: payload.municipality_id,
  details: payload.details,
  area_hectares: payload.area_hectares,
  altitude_masl: String(payload.altitude_masl),
  latitude: payload.latitude,
  longitude: payload.longitude,
});

export type QueuedFarm = {
  id: string;
  values: FarmFormValues;
  status: QueueStatus;
  errorMessage?: string;
};

export async function getQueuedFarm(
  userId: string,
  id: string,
): Promise<QueuedFarm | null> {
  const item = await getOfflineDb(userId).queue.get(id);
  if (!item || item.resource !== FARM_RESOURCE) return null;
  return {
    id,
    // La cola de fincas solo la escribe este módulo, siempre con esta forma.
    values: toFormValues(item.payload as FarmCreatePayload),
    status: item.status,
    errorMessage: item.errorMessage,
  };
}

export const resubmitFarm = (
  userId: string,
  id: string,
  values: FarmFormValues,
) => resubmit(userId, id, toCreatePayload(id, values));
