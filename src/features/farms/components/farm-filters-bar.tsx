'use client';

import { TextField } from '@/components/text-field';
import { NativeSelect } from '@/components/ui/native-select';
import { useMunicipalities } from '@/lib/api/municipalities';

import type { useFarmFilters } from '../use-farm-filters';

// Arriba de la lista y del mapa: lo que se busca o el municipio que se elige cambia a los dos.
export function FarmFiltersBar({
  filters,
}: {
  filters: ReturnType<typeof useFarmFilters>;
}) {
  const municipalities = useMunicipalities();

  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField
        label="Buscar finca"
        onChange={(event) => filters.setSearchInput(event.target.value)}
        placeholder="Nombre, municipio o vereda"
        type="search"
        value={filters.searchInput}
        wrapperClassName="w-full max-w-md"
      />
      <NativeSelect
        aria-label="Filtrar por municipio"
        className="text-sm"
        onChange={(event) =>
          void filters.setMunicipality(event.target.value || null)
        }
        value={filters.municipality ?? ''}
      >
        <option value="">Todos los municipios</option>
        {(municipalities.data ?? []).map((municipality) => (
          <option key={municipality.code} value={municipality.code}>
            {municipality.name}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
