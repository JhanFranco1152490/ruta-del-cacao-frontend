'use client';

import { FilterRow } from '@/components/filter-row';
import { ProducerFilter } from '@/components/producer-filter';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { BuyerType } from '../api';
import type { BuyerFilters, BuyerStatusFilter } from '../buyer-filters';
import { BUYER_TYPE_OPTIONS } from '../buyer-types';

// Una sola fila sin etiquetas visibles; en celular, el buscador y «Filtros». El productor (solo la
// cuenta técnica) va antes que los atributos.
export function BuyerFiltersBar({
  filters,
  onSearch,
  onType,
  onStatus,
  onClear,
  producer,
  onProducer,
}: {
  filters: BuyerFilters;
  onSearch: (search: string) => void;
  onType: (type: BuyerType | '') => void;
  onStatus: (status: BuyerStatusFilter) => void;
  onClear: () => void;
  producer?: string | null;
  onProducer?: (producer: string | null) => void;
}) {
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const hasFilters =
    !!filters.search || !!filters.type || filters.status !== 'active';

  return (
    <FilterRow
      activeCount={
        (producer ? 1 : 0) +
        (filters.type ? 1 : 0) +
        (filters.status !== 'active' ? 1 : 0)
      }
      search={
        <TextField
          hideLabel
          label="Buscar comprador"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar comprador"
          type="search"
          value={filters.search}
          wrapperClassName="min-w-0 flex-1 sm:min-w-64"
        />
      }
      trailing={
        hasFilters && (
          <Button onClick={onClear} size="office" variant="outline">
            Limpiar
          </Button>
        )
      }
    >
      {onProducer && (
        <ProducerFilter
          className="w-full sm:w-80"
          hideLabel
          onClear={() => onProducer(null)}
          onSelect={onProducer}
          placeholder="Productor: nombre, documento o código"
          producer={producer ?? undefined}
          selected={selectedProducer}
        />
      )}
      <SelectField
        hideLabel
        label="Filtrar por tipo"
        onChange={(event) => onType(event.target.value as BuyerType | '')}
        value={filters.type}
        wrapperClassName="w-full sm:w-56"
      >
        <option value="">Todos los tipos</option>
        {BUYER_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        hideLabel
        label="Filtrar por estado"
        onChange={(event) => onStatus(event.target.value as BuyerStatusFilter)}
        value={filters.status}
        wrapperClassName="w-full sm:w-40"
      >
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="all">Todos</option>
      </SelectField>
    </FilterRow>
  );
}
