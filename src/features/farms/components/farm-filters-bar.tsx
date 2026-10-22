'use client';

import { FilterRow } from '@/components/filter-row';
import { MunicipalityFilter } from '@/components/municipality-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { TextField } from '@/components/text-field';
import { useMunicipalities } from '@/lib/api/municipalities';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { useFarmFilters } from '../use-farm-filters';

// Arriba de la lista y del mapa: lo que se busca o el municipio que se elige cambia a los dos. Una
// sola fila sin etiquetas visibles (cada campo dice qué es con su texto); en celular queda el
// buscador y un botón «Filtros» que abre el resto, para que la lista llegue antes.
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
  const active = (filters.municipality ? 1 : 0) + (filters.producer ? 1 : 0);

  return (
    <FilterRow
      activeCount={active}
      search={
        <TextField
          hideLabel
          label="Buscar finca"
          onChange={(event) => filters.setSearchInput(event.target.value)}
          placeholder="Buscar finca"
          type="search"
          value={filters.searchInput}
          wrapperClassName="min-w-0 flex-1 sm:w-80 sm:flex-none"
        />
      }
    >
      {pickProducer && (
        <ProducerFilter
          className="w-full sm:w-80"
          hideLabel
          label="Filtrar por productor"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          placeholder="Productor: nombre, documento o código"
          producer={filters.producer ?? undefined}
          selected={selectedProducer}
          showTrigger={false}
        />
      )}
      <MunicipalityFilter
        className="w-full sm:w-64"
        hideLabel
        municipalities={municipalities.data ?? []}
        onChange={(code) => void filters.setMunicipality(code)}
        value={filters.municipality}
      />
    </FilterRow>
  );
}
