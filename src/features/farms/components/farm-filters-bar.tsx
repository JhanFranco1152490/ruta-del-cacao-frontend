'use client';

import { MunicipalityFilter } from '@/components/municipality-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { TextField } from '@/components/text-field';
import { useMunicipalities } from '@/lib/api/municipalities';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { useFarmFilters } from '../use-farm-filters';

// Arriba de la lista y del mapa: lo que se busca o el municipio que se elige cambia a los dos.
export function FarmFiltersBar({
  filters,
  pickProducer = false,
}: {
  filters: ReturnType<typeof useFarmFilters>;
  // Solo la asociación ve fincas de varios productores y puede quedarse con las de uno.
  pickProducer?: boolean;
}) {
  const municipalities = useMunicipalities();
  const selectedProducer = useProducerSummary(
    pickProducer ? (filters.producer ?? undefined) : undefined,
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField
        label="Buscar finca"
        onChange={(event) => filters.setSearchInput(event.target.value)}
        placeholder="Nombre de la finca"
        type="search"
        value={filters.searchInput}
        wrapperClassName="w-full max-w-md"
      />
      <MunicipalityFilter
        className="w-full sm:w-64"
        municipalities={municipalities.data ?? []}
        onChange={(code) => void filters.setMunicipality(code)}
        value={filters.municipality}
      />
      {pickProducer && (
        <ProducerFilter
          className="w-full sm:w-80"
          showTrigger={false}
          label="Filtrar por productor"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          placeholder="Nombre, documento o código"
          producer={filters.producer ?? undefined}
          selected={selectedProducer}
        />
      )}
    </div>
  );
}
