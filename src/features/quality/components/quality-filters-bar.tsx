'use client';

import { FilterRow } from '@/components/filter-row';
import { SearchSelect } from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { QualityView } from '../use-quality-filters';
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
      activeCount={filters.filters.farm ? 1 : 0}
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
    </FilterRow>
  );
}
