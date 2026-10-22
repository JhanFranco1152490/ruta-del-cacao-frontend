'use client';

import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { DryingShed } from '@/components/illustrations/drying-shed';
import { Button } from '@/components/ui/button';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import type { FarmOption } from '@/lib/api/farm-options';
import { farmLabel } from '@/lib/format/place-label';

import type { PostharvestFacility } from '../api';
import type { FacilityAction, FacilityActionKind } from '../facility-actions';
import {
  facilitiesOfFarm,
  filterFacilities,
  noMatchesText,
} from '../facility-filters';
import { useFacilityFilters } from '../use-facility-filters';
import { FacilityFiltersBar } from './facility-filters-bar';
import { FacilityRowMenu } from './facility-row-menu';
import { FacilitySheet } from './facility-sheet';
import { FacilitySheetActions } from './facility-sheet-actions';
import { FacilitySummaryCards } from './facility-summary-cards';
import { FacilityTable } from './facility-table';

const countText = (count: number) =>
  `${count === 1 ? '1 elemento' : `${count} elementos`} · ordenados por tipo y nombre`;

// Los cajones y marquesinas de una finca, con su resumen, sus filtros y sus acciones.
export function FacilityList({
  farm,
  facilities,
  register,
  lotHref,
  actionsOf,
  offline,
  onAction,
}: {
  farm: FarmOption;
  // Todos los del productor: la finca y los filtros se aplican aquí.
  facilities: readonly PostharvestFacility[];
  // «Registrar elemento», para la finca sin elementos; falta sin el permiso.
  register: ReactNode;
  // El enlace a la ficha de un lote; falta para quien no puede ver lotes.
  lotHref?: (id: string) => string;
  actionsOf: (facility: PostharvestFacility) => FacilityAction[];
  // Sin conexión las acciones se ven deshabilitadas.
  offline: boolean;
  onAction: (kind: FacilityActionKind, facility: PostharvestFacility) => void;
}) {
  const state = useFacilityFilters();
  const isDesktop = useIsDesktop();
  const { filters, element } = state;
  const ofFarm = facilitiesOfFarm(facilities, farm.id);

  if (ofFarm.length === 0) {
    return (
      <EmptyState
        action={register}
        illustration={DryingShed}
        title={`${farm.name} aún no tiene cajones ni marquesinas`}
      />
    );
  }

  const shown = filterFacilities(facilities, farm.id, filters);
  // Se busca entre todos los de la finca: el elemento de la URL se abre aunque los filtros lo
  // escondan de la lista.
  const selected = ofFarm.find(({ id }) => id === element);
  return (
    <div className="space-y-5">
      {selected && !isDesktop && (
        <FacilitySheet
          actions={
            <FacilitySheetActions
              actions={actionsOf(selected)}
              offline={offline}
              onAction={(kind) => onAction(kind, selected)}
            />
          }
          facility={selected}
          farmName={farmLabel(farm)}
          lotHref={lotHref}
          onClose={() => state.showElement(null)}
        />
      )}
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
          illustration={DryingShed}
          title="No se encontraron elementos"
        />
      ) : (
        <>
          <FacilityTable
            facilities={shown}
            lotHref={lotHref}
            onSelect={state.showElement}
            renderActions={(facility) => (
              <FacilityRowMenu
                actions={actionsOf(facility)}
                name={facility.name}
                offline={offline}
                onAction={(kind) => onAction(kind, facility)}
              />
            )}
            selectedId={selected?.id ?? null}
          />
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
