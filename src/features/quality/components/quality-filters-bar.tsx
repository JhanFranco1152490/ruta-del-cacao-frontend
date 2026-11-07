'use client';

import { FilterRow } from '@/components/filter-row';
import { SearchSelect } from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { ClosedResultParam, QualityView } from '../use-quality-filters';
import type { QualityScreenState } from '../use-quality-screen';

const VIEW_OPTIONS: readonly { value: QualityView; label: string }[] = [
  { value: 'por-evaluar', label: 'Por evaluar' },
  { value: 'evaluados', label: 'Evaluados' },
  { value: 'cerrados', label: 'Cerrados' },
];

// Las pestañas, el buscador por código y la finca (solo con varias), en una fila. En celular las
// pestañas pasan debajo y la finca queda tras «Filtros».
export function QualityFiltersBar({ screen }: { screen: QualityScreenState }) {
  const { filters } = screen;
  return (
    <FilterRow
      activeCount={
        (filters.filters.farm ? 1 : 0) +
        (filters.view === 'cerrados'
          ? Number(!!filters.closedInputs.result) +
            Number(!!filters.closedInputs.from || !!filters.closedInputs.to)
          : 0)
      }
      compact
      leading={
        <SegmentedControl<QualityView>
          compact
          fullWidth
          label="Vista de calidad"
          onChange={(view) => void filters.setView(view)}
          options={VIEW_OPTIONS}
          value={filters.view}
        />
      }
      search={
        <TextField
          className="h-10 text-sm"
          hideLabel
          label="Buscar por código"
          onChange={(event) => filters.setSearchInput(event.target.value)}
          placeholder="Código del lote"
          type="search"
          value={filters.searchInput}
          wrapperClassName="min-w-0 flex-1 sm:w-72 sm:flex-none"
        />
      }
      trailing={
        filters.hasFilters && (
          <Button
            className="h-10"
            onClick={() => void filters.clear()}
            size="office"
            variant="ghost"
          >
            Limpiar filtros
          </Button>
        )
      }
    >
      {screen.farmOptions.length > 1 && (
        <SearchSelect
          allLabel="Todas las fincas"
          className="w-full sm:w-64"
          compact
          label="Finca"
          onChange={(option) => void filters.setFarm(option?.id ?? null)}
          options={screen.farmOptions}
          value={screen.farm.choice}
        />
      )}
      {filters.view === 'cerrados' && <ClosedFilters screen={screen} />}
    </FilterRow>
  );
}

const RESULT_OPTIONS: readonly { value: ClosedResultParam; label: string }[] = [
  { value: 'clasificados', label: 'Clasificados' },
  { value: 'descartados', label: 'Descartados' },
];

const PARAM_OF_API: Record<string, ClosedResultParam> = {
  classified: 'clasificados',
  discarded: 'descartados',
};

// Solo en Cerrados: el resultado y el periodo de cierre, con los días incluidos.
function ClosedFilters({ screen }: { screen: QualityScreenState }) {
  const { filters } = screen;
  const { result, from, to } = filters.closedInputs;
  return (
    <>
      <SelectField
        className="h-10 text-sm"
        hideLabel
        label="Resultado"
        onChange={(event) =>
          void filters.setResult(
            (event.target.value as ClosedResultParam) || null,
          )
        }
        value={result ? PARAM_OF_API[result] : ''}
        wrapperClassName="w-full sm:w-52"
      >
        <option value="">Todos los resultados</option>
        {RESULT_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      <div className="flex w-full items-start gap-2 sm:w-auto">
        <TextField
          className="h-10 text-sm"
          error={filters.periodError ?? undefined}
          hideLabel
          label="Cerrados desde"
          onChange={(event) => void filters.setFrom(event.target.value)}
          title="Cerrados desde"
          type="date"
          value={from ?? ''}
          wrapperClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
        <span aria-hidden="true" className="pt-2">
          –
        </span>
        <TextField
          className="h-10 text-sm"
          hideLabel
          label="Cerrados hasta"
          onChange={(event) => void filters.setTo(event.target.value)}
          title="Cerrados hasta"
          type="date"
          value={to ?? ''}
          wrapperClassName="min-w-0 flex-1 sm:w-40 sm:flex-none"
        />
      </div>
    </>
  );
}
