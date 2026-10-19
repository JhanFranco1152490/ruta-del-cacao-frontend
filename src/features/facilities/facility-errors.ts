import { isApiError } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

import type { PostharvestFacility } from './api';

type Schemas = components['schemas'];

// El elemento que ya tiene el nombre en la finca, para ofrecer verlo o activarlo.
export type ExistingFacility = Schemas['ExistingFacility'];
export type OccupyingLot = Schemas['OccupyingLot'];

export const FACILITY_ERROR = {
  duplicateName: 'duplicate_facility_name',
  fieldsLocked: 'facility_fields_locked',
  occupied: 'facility_occupied',
  hasRecords: 'facility_has_records',
  farmInactive: 'farm_inactive',
  staleVersion: 'stale_version',
} as const;

export function duplicateFacilityOf(error: unknown): ExistingFacility | null {
  if (!isApiError(error) || error.code !== FACILITY_ERROR.duplicateName) {
    return null;
  }
  return (error.body.existing as ExistingFacility | undefined) ?? null;
}

// El elemento como está ahora en el servidor, cuando otra persona lo cambió primero.
export function currentFacilityOf(error: unknown): PostharvestFacility | null {
  if (!isApiError(error) || error.code !== FACILITY_ERROR.staleVersion) {
    return null;
  }
  return (error.body.current as PostharvestFacility | undefined) ?? null;
}

// El lote que está adentro, cuando se intenta desactivar o eliminar un elemento ocupado.
export function occupyingLotOf(error: unknown): OccupyingLot | null {
  if (!isApiError(error) || error.code !== FACILITY_ERROR.occupied) return null;
  return (error.body.lot as OccupyingLot | undefined) ?? null;
}
