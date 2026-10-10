'use client';

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

  // Una sola rejilla: el productor (solo la cuenta técnica) va con los demás filtros y no deja una
  // fila a medias. En pantallas medianas son dos columnas; en anchas, una por filtro.
  return (
    <div className="space-y-4">
      <div
        className={
          onProducer
            ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr]'
            : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]'
        }
      >
        {onProducer && (
          <ProducerFilter
            onClear={() => onProducer(null)}
            onSelect={onProducer}
            producer={producer ?? undefined}
            selected={selectedProducer}
          />
        )}
        <TextField
          label="Buscar por nombre"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Por ejemplo, urea"
          type="search"
          value={filters.search}
          wrapperClassName={
            onProducer ? undefined : 'sm:col-span-2 lg:col-span-1'
          }
        />
        <SelectField
          label="Filtrar por tipo"
          onChange={(event) => onType(event.target.value as InputType | '')}
          value={filters.type}
        >
          <option value="">Todos</option>
          {INPUT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Estado"
          onChange={(event) =>
            onStatus(event.target.value as InputStatusFilter)
          }
          value={filters.status}
        >
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="all">Todos</option>
        </SelectField>
      </div>
      {hasFilters && (
        <Button onClick={onClear} size="office" variant="outline">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
