import { departmentCodeOf } from '@/lib/departments';
import {
  getOfflineDb,
  type QueueOperation,
  type QueueStatus,
} from '@/lib/offline/db';
import { enqueue, resubmit } from '@/lib/offline/sync-queue';

import type { Farm, FarmCreateRequest } from './api';
import type { FarmFormValues } from './schemas';

export const FARM_RESOURCE = 'farms';

// Los datos de la finca tal como los recibe la API. La ubicación va siempre: el formulario no
// deja guardar sin ella.
export type FarmFields = Required<
  Pick<
    FarmCreateRequest,
    | 'name'
    | 'department_id'
    | 'municipality_id'
    | 'details'
    | 'area_hectares'
    | 'altitude_masl'
    | 'latitude'
    | 'longitude'
  >
>;

// Lo que guarda la cola. Una finca nueva lleva el id del dispositivo; la edición de una finca
// del servidor, la versión que se leyó (el id de la finca es el del item de la cola).
export type FarmCreatePayload = FarmFields & { id: string };
export type FarmUpdatePayload = FarmFields & { expected_version: number };

export const toFields = (values: FarmFormValues): FarmFields => ({
  name: values.name,
  department_id: departmentCodeOf(values.municipality_id),
  municipality_id: values.municipality_id,
  details: values.details,
  area_hectares: values.area_hectares,
  altitude_masl: Number(values.altitude_masl),
  latitude: values.latitude,
  longitude: values.longitude,
});

export const toFormValues = (fields: FarmFields): FarmFormValues => ({
  name: fields.name,
  municipality_id: fields.municipality_id,
  details: fields.details,
  area_hectares: fields.area_hectares,
  altitude_masl: String(fields.altitude_masl),
  latitude: fields.latitude,
  longitude: fields.longitude,
});

export const farmToFormValues = (farm: Farm): FarmFormValues => ({
  name: farm.name,
  municipality_id: farm.municipality.id,
  details: farm.details,
  area_hectares: farm.area_hectares,
  altitude_masl: String(farm.altitude_masl),
  latitude: farm.location.latitude,
  longitude: farm.location.longitude,
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
    payload: { id, ...toFields(values) } satisfies FarmCreatePayload,
  });

// Editar una finca del servidor también pasa por la cola, con la versión que se leyó: si
// alguien la cambió mientras tanto, la API responde `stale_version` y la edición espera en la
// bandeja en vez de pisar el cambio ajeno.
export const enqueueFarmUpdate = (
  userId: string,
  farmId: string,
  values: FarmFormValues,
  expectedVersion: number,
) =>
  enqueue(userId, {
    id: farmId,
    resource: FARM_RESOURCE,
    operation: 'update',
    payload: {
      ...toFields(values),
      expected_version: expectedVersion,
    } satisfies FarmUpdatePayload,
  });

export type QueuedFarm = {
  id: string;
  operation: QueueOperation;
  values: FarmFormValues;
  status: QueueStatus;
  expectedVersion?: number;
  errorCode?: string;
  errorMessage?: string;
};

export async function getQueuedFarm(
  userId: string,
  id: string,
): Promise<QueuedFarm | null> {
  const item = await getOfflineDb(userId).queue.get(id);
  if (!item || item.resource !== FARM_RESOURCE) return null;
  // La cola de fincas solo la escribe este módulo, siempre con estas formas.
  const payload = item.payload as FarmCreatePayload | FarmUpdatePayload;
  return {
    id,
    operation: item.operation,
    values: toFormValues(payload),
    status: item.status,
    expectedVersion:
      'expected_version' in payload ? payload.expected_version : undefined,
    errorCode: item.errorCode,
    errorMessage: item.errorMessage,
  };
}

// Corregir lo que sigue en la cola. Una edición puede reenviarse con otra versión: la de la
// finca vigente en el servidor, después de revisar un `stale_version`.
export const resubmitFarm = (
  userId: string,
  farm: QueuedFarm,
  values: FarmFormValues,
  expectedVersion = farm.expectedVersion,
) =>
  resubmit(
    userId,
    farm.id,
    farm.operation === 'create'
      ? ({ id: farm.id, ...toFields(values) } satisfies FarmCreatePayload)
      : ({
          ...toFields(values),
          expected_version: expectedVersion!,
        } satisfies FarmUpdatePayload),
  );
