'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';

import type { Municipality, ProducerStatus } from '../api';
import type { useProducerFilters } from '../use-producer-filters';

type ProducerFiltersProps = {
  filters: ReturnType<typeof useProducerFilters>;
  municipalities: Municipality[];
};

export function ProducerFilters({
  filters,
  municipalities,
}: ProducerFiltersProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_240px]">
      <div>
        <label className="sr-only" htmlFor="producer-search">
          Buscar productores
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-11 border-input bg-card pl-10"
            id="producer-search"
            onChange={(event) => filters.setSearchInput(event.target.value)}
            placeholder="Buscar por documento, nombre o código"
            value={filters.searchInput}
          />
        </div>
      </div>
      <NativeSelect
        aria-label="Filtrar por estado"
        className="text-sm"
        onChange={(event) =>
          filters.setStatus(
            (event.target.value || null) as ProducerStatus | null,
          )
        }
        value={filters.status ?? ''}
      >
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </NativeSelect>
      <NativeSelect
        aria-label="Filtrar por municipio"
        className="text-sm"
        onChange={(event) =>
          filters.setMunicipality(event.target.value || null)
        }
        value={filters.municipality ?? ''}
      >
        <option value="">Todos los municipios</option>
        {municipalities.map((municipality) => (
          <option key={municipality.code} value={municipality.code}>
            {municipality.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
