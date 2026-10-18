import {
  FACILITY_TYPES,
  type FacilityStatus,
  type FacilityType,
  facilityStatus,
} from '@/lib/facility-labels';

import type { PostharvestFacility } from './api';
import { sortFacilities } from './facility-order';

export type FacilityFilters = {
  type: FacilityType | 'all';
  status: FacilityStatus | 'all';
};

export const ALL_FACILITIES: FacilityFilters = { type: 'all', status: 'all' };

export const facilitiesOfFarm = (
  facilities: readonly PostharvestFacility[],
  farmId: string,
) => facilities.filter((facility) => facility.farm.id === farmId);

const matches = (facility: PostharvestFacility, filters: FacilityFilters) =>
  (filters.type === 'all' || facility.facility_type === filters.type) &&
  (filters.status === 'all' || facility.status === filters.status);

// La lista corre en el dispositivo sobre todos los del productor, para que filtre igual sin
// conexión.
export const filterFacilities = (
  facilities: readonly PostharvestFacility[],
  farmId: string,
  filters: FacilityFilters,
) =>
  sortFacilities(
    facilitiesOfFarm(facilities, farmId).filter((facility) =>
      matches(facility, filters),
    ),
  );

export const hasActiveFilters = (filters: FacilityFilters) =>
  filters.type !== 'all' || filters.status !== 'all';

// La línea bajo «No se encontraron elementos», que repite el filtro: «Ninguna marquesina
// inactiva.»
export function noMatchesText(filters: FacilityFilters) {
  const type = filters.type === 'all' ? null : FACILITY_TYPES[filters.type];
  const subject = type
    ? `${type.feminine ? 'Ninguna' : 'Ningún'} ${type.noun}`
    : 'Ningún elemento';
  if (filters.status === 'all') return `${subject}.`;
  const status = facilityStatus(
    filters.status,
    filters.type === 'all' ? undefined : filters.type,
  );
  return `${subject} ${status.label.toLowerCase()}.`;
}
