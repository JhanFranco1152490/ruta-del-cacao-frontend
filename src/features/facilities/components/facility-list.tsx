'use client';

import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { FarmOption } from '@/lib/api/farm-options';

import type { PostharvestFacility } from '../api';
import {
  facilitiesOfFarm,
  filterFacilities,
  noMatchesText,
} from '../facility-filters';
import { useFacilityFilters } from '../use-facility-filters';
import { FacilityFiltersBar } from './facility-filters-bar';
import { FacilitySummaryCards } from './facility-summary-cards';
import { FacilityTable } from './facility-table';

const countText = (count: number) =>
  `${count === 1 ? '1 elemento' : `${count} elementos`} · ordenados por tipo y nombre`;

// Los cajones y marquesinas de una finca, con su resumen y sus filtros.
export function FacilityList({
  farm,
  facilities,
}: {
  farm: FarmOption;
  // Todos los del productor: la finca y los filtros se aplican aquí.
  facilities: readonly PostharvestFacility[];
}) {
  const state = useFacilityFilters();
  const { filters } = state;

  if (facilitiesOfFarm(facilities, farm.id).length === 0) {
    return (
      <EmptyState title={`${farm.name} aún no tiene cajones ni marquesinas`} />
    );
  }

  const shown = filterFacilities(facilities, farm.id, filters);
  return (
    <div className="space-y-5">
      <FacilitySummaryCards facilities={shown} />
      <FacilityFiltersBar
        filters={filters}
        onClear={state.clear}
        onStatus={state.setStatus}
        onType={state.setType}
      />
      {shown.length === 0 ? (
        <EmptyState
          action={
            <Button onClick={state.clear} size="office" variant="outline">
              Limpiar filtros
            </Button>
          }
          description={noMatchesText(filters)}
          title="No se encontraron elementos"
        />
      ) : (
        <>
          <FacilityTable facilities={shown} />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{countText(shown.length)}</p>
            <p>
              Un elemento inactivo no se ofrece al iniciar fermentaciones o
              secados. Su historial se conserva.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
