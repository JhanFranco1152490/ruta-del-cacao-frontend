import { departmentCodeOf } from '@/features/catalogs/departments';
import { enqueue } from '@/lib/offline/sync-queue';

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
