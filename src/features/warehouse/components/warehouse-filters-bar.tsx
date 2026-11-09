'use client';

import { FilterRow } from '@/components/filter-row';
import { SearchSelect } from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import type { WarehouseView } from '@/lib/paths/warehouse';
import { Plus } from 'lucide-react';

import type { Grade } from '../api';
import { GRADE_LABELS } from '../exit-quantity';
import { OFFLINE_WAREHOUSE_REASON } from '../warehouse-actions';
import { STOCK_ORDER_OPTIONS } from '../stock-order-options';
import type { StockOrdering } from '../use-warehouse-filters';
import type { WarehouseScreenState } from '../use-warehouse-screen';

const VIEW_LABELS: Record<WarehouseView, string> = {
  existencias: 'Existencias',
  'por-ingresar': 'Por ingresar',
  bodegas: 'Bodegas',
};

// Las pestañas, el buscador por código y los filtros de la pestaña, en una fila. En celular las
// pestañas pasan debajo y los filtros quedan tras «Filtros», con el orden de las existencias (en
// escritorio se ordena desde la cabecera de la tabla).
export function WarehouseFiltersBar({
  screen,
  onCreate,
}: {
  screen: WarehouseScreenState;
  // Registrar una bodega: se ofrece en la fila de filtros de la pestaña Bodegas.
  onCreate: () => void;
}) {
  const { filters, view } = screen;
  const stock = filters.stockFilters;
  const onStock = view === 'existencias';
  const activeCount = onStock
    ? [stock.farm, stock.warehouse, stock.grade, stock.location].filter(Boolean)
        .length
    : stock.farm
      ? 1
      : 0;
  return (
    <FilterRow
      activeCount={activeCount}
      compact
      leading={
        <SegmentedControl<WarehouseView>
          compact
          fullWidth
          label="Vista de bodega"
          onChange={(next) => void filters.setView(next)}
          options={screen.views.map((value) => ({
            value,
            label: VIEW_LABELS[value],
          }))}
          value={view}
        />
      }
      search={
        view !== 'bodegas' && (
          <TextField
            className="h-10 text-sm"
            hideLabel
            label="Buscar por código"
            onChange={(event) => filters.setSearchInput(event.target.value)}
            placeholder="Código del lote"
            type="search"
            value={filters.searchInput}
            wrapperClassName="min-w-0 flex-1 sm:w-64 sm:flex-none"
          />
        )
      }
      trailing={
        <>
          {filters.hasFilters && (
            <Button
              className="h-10"
              onClick={() => void filters.clear()}
              size="office"
              variant="ghost"
            >
              Limpiar filtros
            </Button>
          )}
          {view === 'bodegas' && screen.can.manage && (
            <Button
              className="h-10 max-sm:order-first max-sm:w-full sm:ml-auto"
              disabled={screen.offline}
              onClick={onCreate}
              size="office"
              title={screen.offline ? OFFLINE_WAREHOUSE_REASON : undefined}
            >
              <Plus aria-hidden="true" className="size-4" />
              Nueva bodega
            </Button>
          )}
        </>
      }
    >
      {screen.farmOptions.length > 1 && (
        <SearchSelect
          allLabel="Todas las fincas"
          className="w-full sm:w-56"
          compact
          label="Finca"
          onChange={(option) => void filters.setFarm(option?.id ?? null)}
          options={screen.farmOptions}
          value={screen.farm.choice}
        />
      )}
      {onStock && <StockFilters screen={screen} />}
    </FilterRow>
  );
}

function StockFilters({ screen }: { screen: WarehouseScreenState }) {
  const { filters } = screen;
  const stock = filters.stockFilters;
  return (
    <>
      <SelectField
        hideLabel
        label="Bodega"
        onChange={(event) =>
          void filters.setWarehouse(event.target.value || null)
        }
        value={stock.warehouse ?? ''}
        wrapperClassName="w-full sm:w-52"
      >
        <option value="">Todas las bodegas</option>
        {screen.warehouseOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Calibre"
        onChange={(event) =>
          void filters.setGrade((event.target.value || null) as Grade | null)
        }
        value={stock.grade ?? ''}
        wrapperClassName="w-full sm:w-36"
      >
        <option value="">Todos los calibres</option>
        {(['g1', 'g2'] as const).map((grade) => (
          <option key={grade} value={grade}>
            {GRADE_LABELS[grade]}
          </option>
        ))}
      </SelectField>
      <TextField
        className="h-10 text-sm"
        hideLabel
        label="Estante o zona dentro de la bodega"
        onChange={(event) => filters.setLocationInput(event.target.value)}
        placeholder="Estante o zona"
        type="search"
        value={filters.locationInput}
        wrapperClassName="w-full sm:w-40"
      />
      <SelectField
        hideLabel
        label="Ordenar existencias"
        onChange={(event) =>
          void filters.setOrdering(event.target.value as StockOrdering)
        }
        value={screen.ordering}
        wrapperClassName="w-full md:hidden"
      >
        {STOCK_ORDER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
    </>
  );
}
