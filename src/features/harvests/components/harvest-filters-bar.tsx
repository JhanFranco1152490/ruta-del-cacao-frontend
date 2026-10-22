'use client';

import { FilterRow } from '@/components/filter-row';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';

import type { harvestFilterOptions } from '../harvest-rows';
import type { useHarvestFilters } from '../use-harvest-filters';

// En celular los filtros van en columna bajo «Filtros», a todo el ancho: `basis` en una columna es
// el alto, y daría a cada uno 11 rem de alto. De `sm` en adelante comparten la fila.
const FILTER_WIDTH = 'w-full sm:min-w-40 sm:flex-1 sm:basis-44';

// La opción de un filtro puesto. Si ya no está entre las del mes (la finca no tiene cosechas en
// este periodo), se muestra con un texto que lo dice.
function chosen(
  id: string | undefined,
  options: readonly SearchSelectOption[],
  missing: string,
): SearchSelectOption | null {
  if (!id) return null;
  return options.find((option) => option.id === id) ?? { id, label: missing };
}

// Los filtros de la lista del mes. La parcela va siempre a la vista; los demás, en celular, tras
// «Filtros».
export function HarvestFiltersBar({
  state,
  options,
}: {
  state: ReturnType<typeof useHarvestFilters>;
  options: ReturnType<typeof harvestFilterOptions>;
}) {
  const { filters } = state;
  const plots = filters.farm
    ? options.plots.filter(
        ({ id }) => options.farmOfPlot.get(id) === filters.farm,
      )
    : options.plots;

  return (
    <FilterRow
      activeCount={state.activeCount - (filters.plot ? 1 : 0)}
      search={
        <SearchSelect
          allLabel="Todas las parcelas"
          className="min-w-0 flex-1 basis-40 sm:min-w-40 sm:basis-44"
          compact
          label="Parcela"
          onChange={(option) => state.setPlot(option?.id ?? null)}
          options={plots}
          value={chosen(
            filters.plot,
            plots,
            'Parcela sin cosechas en este mes',
          )}
        />
      }
      trailing={
        state.activeCount > 0 && (
          <Button
            className="h-10"
            onClick={state.clear}
            size="office"
            variant="ghost"
          >
            Limpiar filtros
          </Button>
        )
      }
    >
      <SearchSelect
        allLabel="Todas las fincas"
        className={FILTER_WIDTH}
        compact
        label="Finca"
        onChange={(option) => state.setFarm(option?.id ?? null)}
        options={options.farms}
        value={chosen(
          filters.farm,
          options.farms,
          'Finca sin cosechas en este mes',
        )}
      />
      <SelectField
        className="h-10 text-sm"
        hideLabel
        label="Variedad"
        onChange={(event) => state.setVariety(event.target.value || null)}
        value={filters.variety ?? ''}
        wrapperClassName={FILTER_WIDTH}
      >
        <option value="">Todas las variedades</option>
        {options.varieties.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <SelectField
        className="h-10 text-sm"
        hideLabel
        label="Recolector"
        onChange={(event) => state.setCollector(event.target.value || null)}
        value={filters.collector ?? ''}
        wrapperClassName={FILTER_WIDTH}
      >
        <option value="">Todos los recolectores</option>
        {options.collectors.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <SelectField
        className="h-10 text-sm"
        hideLabel
        label="Lote"
        onChange={(event) =>
          state.setLot(
            (event.target.value || null) as 'with' | 'without' | null,
          )
        }
        value={filters.lot ?? ''}
        wrapperClassName={FILTER_WIDTH}
      >
        <option value="">Con y sin lote</option>
        <option value="without">Sin lote</option>
        <option value="with">En un lote</option>
      </SelectField>
    </FilterRow>
  );
}
