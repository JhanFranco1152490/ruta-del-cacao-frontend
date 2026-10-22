'use client';

import { FILTER_CONTROLS_CLASS } from '@/components/filter-row';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import {
  FACILITY_STATUS_ORDER,
  FACILITY_TYPE_ORDER,
  FACILITY_TYPES,
  facilityStatus,
} from '@/lib/facility-labels';

import { type FacilityFilters, hasActiveFilters } from '../facility-filters';

// Son solo dos filtros cortos: a diferencia de otras listas, en celular quedan a la vista y no
// tras «Filtros».
export function FacilityFiltersBar({
  filters,
  onType,
  onStatus,
  onClear,
}: {
  filters: FacilityFilters;
  onType: (type: FacilityFilters['type']) => void;
  onStatus: (status: FacilityFilters['status']) => void;
  onClear: () => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-start gap-3 ${FILTER_CONTROLS_CLASS}`}
    >
      <SelectField
        hideLabel
        label="Filtrar por tipo"
        onChange={(event) =>
          onType(event.target.value as FacilityFilters['type'])
        }
        value={filters.type}
        wrapperClassName="min-w-0 flex-1 sm:w-48 sm:flex-none"
      >
        <option value="all">Todos los tipos</option>
        {FACILITY_TYPE_ORDER.map((type) => (
          <option key={type} value={type}>
            {FACILITY_TYPES[type].label}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Filtrar por estado"
        onChange={(event) =>
          onStatus(event.target.value as FacilityFilters['status'])
        }
        value={filters.status}
        wrapperClassName="min-w-0 flex-1 sm:w-48 sm:flex-none"
      >
        <option value="all">Todos los estados</option>
        {FACILITY_STATUS_ORDER.map((status) => (
          <option key={status} value={status}>
            {facilityStatus(status).label}
          </option>
        ))}
      </SelectField>
      {hasActiveFilters(filters) && (
        <Button onClick={onClear} size="office" variant="outline">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
