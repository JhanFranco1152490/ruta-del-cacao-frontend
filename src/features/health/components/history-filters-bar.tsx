'use client';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';

import type { HistoryFilters } from '../history-filters';

// El periodo (desde y hasta, incluidos) y la plaga o enfermedad del historial. Las plagas que se
// ofrecen son las que aparecen en la parcela.
export function HistoryFiltersBar({
  filters,
  pestOptions,
  periodError,
  hasFilters,
  onFrom,
  onTo,
  onPest,
  onClear,
}: {
  filters: HistoryFilters;
  pestOptions: readonly { value: string; label: string }[];
  periodError?: string;
  hasFilters: boolean;
  onFrom: (date: string) => void;
  onTo: (date: string) => void;
  onPest: (pest: string | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField
        error={periodError}
        label="Desde"
        onChange={(event) => onFrom(event.target.value)}
        type="date"
        value={filters.from ?? ''}
        wrapperClassName="w-full sm:w-44"
      />
      <TextField
        label="Hasta"
        onChange={(event) => onTo(event.target.value)}
        type="date"
        value={filters.to ?? ''}
        wrapperClassName="w-full sm:w-44"
      />
      <SelectField
        label="Plaga o enfermedad"
        onChange={(event) => onPest(event.target.value || null)}
        value={filters.pest ?? ''}
        wrapperClassName="w-full sm:w-64"
      >
        <option value="">Todas</option>
        {pestOptions.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      {hasFilters && (
        <Button
          className="h-11"
          onClick={onClear}
          type="button"
          variant="outline"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
