'use client';

import { FilterRow } from '@/components/filter-row';
import { ProducerFilter } from '@/components/producer-filter';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';

import {
  INPUT_TYPE_OPTIONS,
  type InputFilters,
  type InputStatusFilter,
  type InputType,
} from '../input-options';

export function InputFiltersBar({
  filters,
  onSearch,
  onType,
  onStatus,
  onClear,
  producer,
  onProducer,
}: {
  filters: InputFilters;
  onSearch: (search: string) => void;
  onType: (type: InputType | '') => void;
  onStatus: (status: InputStatusFilter) => void;
  onClear: () => void;
  // Solo para la cuenta técnica, que ve los catálogos de todos los productores.
  producer?: string | null;
  onProducer?: (producer: string | null) => void;
}) {
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const hasFilters =
    !!filters.search || !!filters.type || filters.status !== 'active';

  // Una sola fila sin etiquetas visibles; en celular, el buscador y «Filtros». El productor (solo la
  // cuenta técnica) va con los demás.
  return (
    <div className="space-y-3">
      <FilterRow
        activeCount={
          (producer ? 1 : 0) +
          (filters.type ? 1 : 0) +
          (filters.status !== 'active' ? 1 : 0)
        }
        search={
          <TextField
            hideLabel
            label="Buscar por nombre"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar por nombre"
            type="search"
            value={filters.search}
            wrapperClassName="min-w-0 flex-1 sm:min-w-64"
          />
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
          onChange={(event) => onType(event.target.value as InputType | '')}
          value={filters.type}
          wrapperClassName="w-full sm:w-44"
        >
          <option value="">Todos los tipos</option>
          {INPUT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          hideLabel
          label="Estado"
          onChange={(event) =>
            onStatus(event.target.value as InputStatusFilter)
          }
          value={filters.status}
          wrapperClassName="w-full sm:w-40"
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </SelectField>
      </FilterRow>
      {hasFilters && (
        <Button onClick={onClear} size="office" variant="outline">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
