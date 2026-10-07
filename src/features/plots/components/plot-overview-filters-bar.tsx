'use client';

import { ProducerFilter } from '@/components/producer-filter';
import { TextField } from '@/components/text-field';
import { NativeSelect } from '@/components/ui/native-select';
import type { FarmOption } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { usePlotFilters } from '../use-plot-filters';

export function PlotOverviewFiltersBar({
  filters,
  farms,
  pickProducer = false,
}: {
  filters: ReturnType<typeof usePlotFilters>;
  // Sin fincas que ofrecer (la cuenta técnica antes de elegir productor) no hay filtro de finca.
  farms?: readonly FarmOption[];
  // Solo quien ve parcelas de varios productores puede quedarse con las de uno.
  pickProducer?: boolean;
}) {
  const selectedProducer = useProducerSummary(
    pickProducer ? (filters.producer ?? undefined) : undefined,
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <TextField
        label="Buscar parcela"
        onChange={(event) => filters.setSearchInput(event.target.value)}
        placeholder="Código de la parcela"
        type="search"
        value={filters.searchInput}
        wrapperClassName="w-full max-w-md"
      />
      {pickProducer && (
        <ProducerFilter
          className="w-full sm:w-80"
          label="Filtrar por productor"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          placeholder="Nombre, documento o código"
          producer={filters.producer ?? undefined}
          selected={selectedProducer}
          showTrigger={false}
        />
      )}
      {farms && farms.length > 0 && (
        <NativeSelect
          aria-label="Filtrar por finca"
          className="text-sm sm:w-64"
          onChange={(event) => void filters.setFarm(event.target.value || null)}
          value={filters.farm ?? ''}
        >
          <option value="">Todas las fincas</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </NativeSelect>
      )}
    </div>
  );
}
