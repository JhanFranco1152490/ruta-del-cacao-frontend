'use client';

import { ProducerFilter } from '@/components/producer-filter';
import { TextField } from '@/components/text-field';
import { NativeSelect } from '@/components/ui/native-select';
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
      <NativeSelect
        aria-label="Filtrar por municipio"
        className="text-sm sm:w-64"
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
      {pickProducer && (
        // La asociación lee las fincas de todos los productores, tengan o no encendido su
        // interruptor de acceso: no hay aviso de acceso denegado que mostrar.
        <ProducerFilter
          className="w-full sm:w-80"
          deniedMessage={null}
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
