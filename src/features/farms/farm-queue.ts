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
// `producer_id` solo lo manda la cuenta técnica, que no tiene un productor propio.
export type FarmCreatePayload = FarmFields & {
  id: string;
  producer_id?: string;
};
export type FarmUpdatePayload = FarmFields & { expected_version: number };

// Versión con la que el servidor crea toda finca. Es la única que conoce el dispositivo que la
// creó: editarla esperando esa versión aplica el cambio si nadie la tocó desde entonces, y si
// alguien la cambió, el servidor responde `stale_version` en vez de pisar ese cambio.
export const CREATED_FARM_VERSION = 1;

// Un alta pendiente que en realidad ya existe en el servidor (se perdió la respuesta) se
// reenvía como edición de esa finca, con el contenido que tiene ahora en el dispositivo.
export const createToUpdate = (
  payload: FarmCreatePayload,
): FarmUpdatePayload => ({
  name: payload.name,
  department_id: payload.department_id,
  municipality_id: payload.municipality_id,
  details: payload.details,
  area_hectares: payload.area_hectares,
  altitude_masl: payload.altitude_masl,
  latitude: payload.latitude,
  longitude: payload.longitude,
  expected_version: CREATED_FARM_VERSION,
});

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

export const toFormValues = (
  fields: FarmFields & { producer_id?: string },
): FarmFormValues => ({
  ...(fields.producer_id && { producer_id: fields.producer_id }),
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

const createPayload = (
  id: string,
  values: FarmFormValues,
): FarmCreatePayload => ({
  id,
  ...toFields(values),
  ...(values.producer_id && { producer_id: values.producer_id }),
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
    payload: createPayload(id, values),
  });

// Editar una finca del servidor también pasa por la cola, con la versión que se leyó: si
// alguien la cambió mientras tanto, la API responde `stale_version` y la edición espera en la
// bandeja en vez de pisar el cambio ajeno. Si la finca ya tiene una edición esperando (otra
// pestaña la guardó mientras esta seguía abierta), se rechaza: esta no es un reintento de
// aquella, y guardarla en silencio la perdería.
export const enqueueFarmUpdate = (
  userId: string,
  farmId: string,
  values: FarmFormValues,
  expectedVersion: number,
) =>
  enqueue(
    userId,
    {
      id: farmId,
      resource: FARM_RESOURCE,
      operation: 'update',
      payload: {
        ...toFields(values),
        expected_version: expectedVersion,
      } satisfies FarmUpdatePayload,
    },
    { rejectExisting: true },
  );

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
      ? createPayload(farm.id, values)
      : ({
          ...toFields(values),
          expected_version: expectedVersion!,
        } satisfies FarmUpdatePayload),
  );
