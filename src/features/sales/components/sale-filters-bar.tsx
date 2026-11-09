'use client';

import { FilterRow } from '@/components/filter-row';
import { SearchSelect } from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { SalesScreenState } from '../use-sales-screen';
import {
  SALE_STATUS_FILTERS,
  type SaleStatusFilter,
} from '../use-sale-filters';

const STATUS_LABELS: Record<SaleStatusFilter, string> = {
  registered: 'Registradas',
  voided: 'Anuladas',
  all: 'Todas',
};

// El buscador por número y los filtros, en el orden de las demás listas: comprador, finca (si hay
// varias) y estado, con «Limpiar filtros» al final. En celular quedan tras «Filtros».
export function SaleFiltersBar({ screen }: { screen: SalesScreenState }) {
  const { filters } = screen;
  const activeCount = [
    filters.filters.buyer,
    filters.filters.farm,
    filters.status !== 'registered',
  ].filter(Boolean).length;
  return (
    <FilterRow
      activeCount={activeCount}
      compact
      search={
        <TextField
          className="h-10 text-sm"
          hideLabel
          inputMode="numeric"
          label="Buscar por número de venta"
          onChange={(event) => filters.setSearchInput(event.target.value)}
          placeholder="Número de venta"
          type="search"
          value={filters.searchInput}
          wrapperClassName="min-w-0 flex-1 sm:w-56 sm:flex-none"
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
      <SearchSelect
        allLabel="Todos los compradores"
        className="w-full sm:w-64"
        compact
        label="Comprador"
        onChange={(option) => void filters.setBuyer(option?.id ?? null)}
        options={screen.buyerOptions}
        value={screen.buyer}
      />
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
      <SelectField
        hideLabel
        label="Estado"
        onChange={(event) =>
          void filters.setStatus(event.target.value as SaleStatusFilter)
        }
        value={filters.status}
        wrapperClassName="w-full sm:w-40"
      >
        {SALE_STATUS_FILTERS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </SelectField>
    </FilterRow>
  );
}
