'use client';

import { FILTER_CONTROLS_CLASS } from '@/components/filter-row';
import { ProducerFilter } from '@/components/producer-filter';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';

import type {
  ActivityFilters,
  FarmOption,
  FarmPlotOptions,
} from '../activity-filters';
import { farmLabel } from '@/lib/format/place-label';

// El ancho de cada filtro de la fila: crece para llenarla y cabe en el celular.
// En celular los filtros van en columna bajo «Filtros», a todo el ancho: `basis` en una columna es
// el alto, y daría a cada uno 11 rem de alto. De `sm` en adelante comparten la fila.
const FILTER_WIDTH = 'w-full sm:min-w-40 sm:flex-1 sm:basis-44';

// La opción que muestra un filtro puesto. Si ya no está entre las que se ofrecen (la finca o la
// parcela no tiene actividades en este periodo), se muestra con un texto que lo dice.
function selected(
  id: string | null,
  options: readonly SearchSelectOption[],
  missing: string,
): SearchSelectOption | null {
  if (id === null) return null;
  return options.find((option) => option.id === id) ?? { id, label: missing };
}

// Los filtros del calendario en una fila: finca, parcela y responsable, el atajo de lo asignado a
// la persona y, si hay alguno puesto, el botón para quitarlos. El estado se filtra desde los
// recuentos, que ya muestran cuántas hay de cada uno.
export function ActivityFiltersBar({
  filters,
  farmOptions,
  plotOptions,
  assigneeOptions,
  assignedToMe,
  hasFilters,
  onFarm,
  onPlot,
  onAssignee,
  onToggleAssignedToMe,
  onClear,
  producer,
  onProducer,
  onlyFarm = null,
}: {
  filters: ActivityFilters;
  farmOptions: readonly FarmOption[];
  plotOptions: readonly FarmPlotOptions[];
  assigneeOptions: readonly { id: string; label: string }[];
  assignedToMe: boolean;
  hasFilters: boolean;
  onFarm: (farm: string | null) => void;
  onPlot: (plot: string | null) => void;
  onAssignee: (assignee: string | null) => void;
  onToggleAssignedToMe: () => void;
  onClear: () => void;
  // Solo para la cuenta técnica, que ve las actividades de todos los productores.
  producer?: string | null;
  onProducer?: (producer: string | null) => void;
  // La finca de quien trabaja en una sola: el filtro queda fijo en ella.
  onlyFarm?: { id: string; name: string } | null;
}) {
  const selectedProducer = useProducerSummary(producer ?? undefined);
  // Con una finca elegida, la lista de parcelas es la de esa finca.
  const shownPlots = filters.farm
    ? plotOptions.filter(({ farmId }) => farmId === filters.farm)
    : plotOptions;
  const plotChoices = shownPlots.flatMap((farm) =>
    farm.plots.map((plot) => ({
      id: plot.id,
      label: plot.isActive ? plot.code : `${plot.code} (inactiva)`,
      group: farm.farmName,
    })),
  );

  return (
    <div className={`flex flex-wrap items-end gap-2 ${FILTER_CONTROLS_CLASS}`}>
      {onProducer && (
        <ProducerFilter
          className={FILTER_WIDTH}
          compact
          onClear={() => onProducer(null)}
          onSelect={onProducer}
          placeholder="Buscar productor"
          producer={producer ?? undefined}
          selected={selectedProducer}
        />
      )}
      {onlyFarm ? (
        <SearchSelect
          className={FILTER_WIDTH}
          compact
          disabled
          label="Finca"
          onChange={() => undefined}
          options={[{ id: onlyFarm.id, label: onlyFarm.name }]}
          value={{ id: onlyFarm.id, label: onlyFarm.name }}
        />
      ) : (
        <SearchSelect
          allLabel="Todas las fincas"
          className={FILTER_WIDTH}
          compact
          label="Finca"
          onChange={(option) => onFarm(option?.id ?? null)}
          options={farmOptions.map((farm) => ({
            id: farm.id,
            label: farmLabel(farm),
          }))}
          value={selected(
            filters.farm,
            farmOptions.map((farm) => ({
              id: farm.id,
              label: farmLabel(farm),
            })),
            'Finca sin actividades en este periodo',
          )}
        />
      )}
      <SearchSelect
        allLabel="Todas las parcelas"
        className={FILTER_WIDTH}
        compact
        label="Parcela"
        onChange={(option) => onPlot(option?.id ?? null)}
        options={plotChoices}
        value={selected(
          filters.plot,
          plotChoices,
          'Parcela sin actividades en este periodo',
        )}
      />
      <SearchSelect
        allLabel="Todos los responsables"
        className={FILTER_WIDTH}
        compact
        label="Responsable"
        onChange={(option) => onAssignee(option?.id ?? null)}
        options={assigneeOptions}
        value={selected(filters.assignee, assigneeOptions, 'Otra cuenta')}
      />
      <Button
        aria-pressed={assignedToMe}
        className="h-10"
        onClick={onToggleAssignedToMe}
        size="office"
        variant={assignedToMe ? 'default' : 'outline'}
      >
        Asignadas a mí
      </Button>
      {hasFilters && (
        <Button
          className="h-10"
          onClick={onClear}
          size="office"
          variant="ghost"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
