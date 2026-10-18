'use client';

import { FilterRow } from '@/components/filter-row';
import { ProducerFilter } from '@/components/producer-filter';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { HistoryFilters } from '../history-filters';

const chosen = (
  id: string | null,
  options: readonly SearchSelectOption[],
  name: (id: string) => string,
): SearchSelectOption | null =>
  id === null
    ? null
    : (options.find((option) => option.id === id) ?? { id, label: name(id) });

// Los filtros del historial en una fila, como los de Insumos y Actividades: finca, parcela, plaga o
// enfermedad y periodo. En celular quedan la finca y «Filtros». La cuenta técnica elige además el
// productor.
export function HistoryFiltersBar({
  filters,
  farmOptions,
  plotOptions,
  pestOptions,
  farmName,
  plotCode,
  periodError,
  hasFilters,
  onFarm,
  onPlot,
  onPest,
  onFrom,
  onTo,
  onClear,
  onProducer,
}: {
  filters: HistoryFilters;
  farmOptions: readonly SearchSelectOption[];
  plotOptions: readonly SearchSelectOption[];
  pestOptions: readonly { value: string; label: string }[];
  farmName: (id: string) => string;
  plotCode: (id: string) => string;
  periodError?: string;
  hasFilters: boolean;
  onFarm: (farm: string | null) => void;
  onPlot: (plot: string | null) => void;
  onPest: (pest: string | null) => void;
  onFrom: (date: string) => void;
  onTo: (date: string) => void;
  onClear: () => void;
  // Solo para la cuenta técnica, que ve el historial de todos los productores.
  onProducer?: (producer: string | null) => void;
}) {
  const selectedProducer = useProducerSummary(filters.producer ?? undefined);
  const activeCount = [
    filters.producer,
    filters.plot,
    filters.pest,
    filters.from,
    filters.to,
  ].filter(Boolean).length;

  return (
    <div className="space-y-2">
      <FilterRow
        activeCount={activeCount}
        search={
          <SearchSelect
            allLabel="Todas las fincas"
            className="min-w-40 flex-1 basis-44"
            compact
            label="Finca"
            onChange={(option) => onFarm(option?.id ?? null)}
            options={farmOptions}
            value={chosen(filters.farm, farmOptions, farmName)}
          />
        }
      >
        {onProducer && (
          <ProducerFilter
            className="w-full sm:w-64"
            compact
            onClear={() => onProducer(null)}
            onSelect={onProducer}
            placeholder="Buscar productor"
            producer={filters.producer ?? undefined}
            selected={selectedProducer}
          />
        )}
        <SearchSelect
          allLabel="Todas las parcelas"
          className="min-w-40 flex-1 basis-44"
          compact
          label="Parcela"
          onChange={(option) => onPlot(option?.id ?? null)}
          options={plotOptions}
          value={chosen(filters.plot, plotOptions, plotCode)}
        />
        <SelectField
          className="h-10 text-sm"
          hideLabel
          label="Plaga o enfermedad"
          onChange={(event) => onPest(event.target.value || null)}
          value={filters.pest ?? ''}
          wrapperClassName="w-full sm:w-48"
        >
          <option value="">Todas las plagas</option>
          {pestOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <div className="flex w-full items-start gap-2 sm:w-auto">
          <TextField
            className="h-10 text-sm"
            error={periodError}
            hideLabel
            label="Desde"
            onChange={(event) => onFrom(event.target.value)}
            title="Desde"
            type="date"
            value={filters.from ?? ''}
            wrapperClassName="min-w-0 flex-1 sm:w-36 sm:flex-none"
          />
          <span aria-hidden="true" className="pt-2">
            –
          </span>
          <TextField
            className="h-10 text-sm"
            hideLabel
            label="Hasta"
            onChange={(event) => onTo(event.target.value)}
            title="Hasta"
            type="date"
            value={filters.to ?? ''}
            wrapperClassName="min-w-0 flex-1 sm:w-36 sm:flex-none"
          />
        </div>
      </FilterRow>
      {hasFilters && (
        <Button
          className="h-9"
          onClick={onClear}
          size="office"
          type="button"
          variant="ghost"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
