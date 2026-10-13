'use client';

import { type ReactNode, useId } from 'react';

import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { useProducerSummary } from '@/lib/api/producer-options';

import type {
  ActivityFilters,
  FarmOption,
  FarmPlotOptions,
} from '../activity-filters';

// El valor de "todas" en un select es el vacío, que los filtros leen como "sin filtro".
const ALL = '';

// Un filtro compacto: la etiqueta existe para los lectores de pantalla y la opción de "todas"
// dice a qué se refiere, así la barra ocupa una sola fila.
function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="min-w-40 flex-1 basis-44">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <NativeSelect
        className="h-10 text-sm"
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </NativeSelect>
    </div>
  );
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
}) {
  const selectedProducer = useProducerSummary(producer ?? undefined);
  // Con una finca elegida, la lista de parcelas es la de esa finca.
  const shownPlots = filters.farm
    ? plotOptions.filter(({ farmId }) => farmId === filters.farm)
    : plotOptions;
  const farmKnown =
    filters.farm === null || farmOptions.some(({ id }) => id === filters.farm);
  const plotKnown =
    filters.plot === null ||
    shownPlots.some(({ plots }) => plots.some(({ id }) => id === filters.plot));
  const assigneeKnown =
    filters.assignee === null ||
    assigneeOptions.some(({ id }) => id === filters.assignee);

  return (
    <div className="flex flex-wrap items-end gap-2">
      {onProducer && (
        <ProducerFilter
          className="min-w-64 flex-1 basis-72"
          onClear={() => onProducer(null)}
          onSelect={onProducer}
          producer={producer ?? undefined}
          selected={selectedProducer}
        />
      )}
      <FilterSelect
        label="Finca"
        onChange={(value) => onFarm(value || null)}
        value={filters.farm ?? ALL}
      >
        <option value={ALL}>Todas las fincas</option>
        {!farmKnown && (
          <option value={filters.farm!}>
            Finca sin actividades en este periodo
          </option>
        )}
        {farmOptions.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Parcela"
        onChange={(value) => onPlot(value || null)}
        value={filters.plot ?? ALL}
      >
        <option value={ALL}>Todas las parcelas</option>
        {!plotKnown && (
          <option value={filters.plot!}>
            Parcela sin actividades en este periodo
          </option>
        )}
        {shownPlots.map((farm) => (
          <optgroup key={farm.farmId} label={farm.farmName}>
            {farm.plots.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.isActive ? plot.code : `${plot.code} (inactiva)`}
              </option>
            ))}
          </optgroup>
        ))}
      </FilterSelect>
      <FilterSelect
        label="Responsable"
        onChange={(value) => onAssignee(value || null)}
        value={filters.assignee ?? ALL}
      >
        <option value={ALL}>Todos los responsables</option>
        {!assigneeKnown && (
          <option value={filters.assignee!}>Otra cuenta</option>
        )}
        {assigneeOptions.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </FilterSelect>
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
