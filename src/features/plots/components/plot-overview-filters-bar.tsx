'use client';

import { FarmFilter } from '@/components/farm-filter';
import { FilterRow } from '@/components/filter-row';
import { ProducerFilter } from '@/components/producer-filter';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { useSession } from '@/hooks/use-session';
import { onlyFarmOf } from '@/lib/farm-scope';
import { useFarmDetail } from '@/lib/api/farm-detail';
import { useProducerSummary } from '@/lib/api/producer-options';

import type {
  CharacterizationState,
  Grouping,
  usePlotFilters,
} from '../use-plot-filters';

const CHARACTERIZATION_LABELS: Record<CharacterizationState, string> = {
  'sin-caracterizar': 'Sin caracterizar',
  caracterizadas: 'Caracterizadas',
  'con-error': 'Con error',
};

export function PlotOverviewFiltersBar({
  filters,
  pickProducer = false,
}: {
  filters: ReturnType<typeof usePlotFilters>;
  // Solo quien ve parcelas de varios productores filtra y agrupa por productor.
  pickProducer?: boolean;
}) {
  const { data: user } = useSession();
  // El nombre de la finca elegida, que puede no estar entre lo que trae el buscador.
  const farm = useFarmDetail(user?.id, filters.farm ?? '');
  const selectedProducer = useProducerSummary(
    pickProducer ? (filters.producer ?? undefined) : undefined,
  );
  return (
    <FilterRow
      activeCount={
        (filters.farm ? 1 : 0) +
        (filters.producer ? 1 : 0) +
        (filters.characterization ? 1 : 0)
      }
      search={
        <TextField
          hideLabel
          label="Buscar parcela"
          onChange={(event) => filters.setSearchInput(event.target.value)}
          placeholder="Código de la parcela"
          type="search"
          value={filters.searchInput}
          wrapperClassName="min-w-0 flex-1 sm:w-52 sm:flex-none"
        />
      }
    >
      {/* Quien trabaja en una sola finca no tiene otra que buscar. */}
      {!onlyFarmOf(user) && (
        <FarmFilter
          className="w-full sm:w-56"
          farm={filters.farm ?? undefined}
          hideLabel
          label="Filtrar por finca"
          onClear={() => void filters.setFarm(null)}
          onSelect={(option) =>
            void filters.setFarm(option.id, option.producer.id)
          }
          producer={filters.producer ?? undefined}
          selectedLabel={filters.farm ? farm.data?.data.name : undefined}
          showProducer={pickProducer}
        />
      )}
      {pickProducer && (
        <ProducerFilter
          className="w-full sm:w-64"
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
      <SelectField
        hideLabel
        label="Caracterización"
        onChange={(event) =>
          void filters.setCharacterization(
            (event.target.value || null) as CharacterizationState | null,
          )
        }
        value={filters.characterization ?? ''}
        wrapperClassName="w-full sm:w-52"
      >
        <option value="">Caracterización: todas</option>
        {(Object.keys(CHARACTERIZATION_LABELS) as CharacterizationState[]).map(
          (value) => (
            <option key={value} value={value}>
              {CHARACTERIZATION_LABELS[value]}
            </option>
          ),
        )}
      </SelectField>
    </FilterRow>
  );
}

// Cómo se agrupa la lista: va sobre las tarjetas y no en la fila de filtros, que ya está llena.
export function PlotGroupingControl({
  filters,
  pickProducer = false,
}: {
  filters: ReturnType<typeof usePlotFilters>;
  pickProducer?: boolean;
}) {
  const groupings: { value: Grouping; label: string }[] = [
    { value: 'ninguno', label: 'Sin agrupar' },
    ...(pickProducer
      ? [{ value: 'productor' as const, label: 'Por productor' }]
      : []),
    { value: 'finca', label: 'Por finca' },
  ];
  return (
    <SegmentedControl
      label="Agrupar"
      onChange={(value) => void filters.setGrouping(value)}
      options={groupings}
      value={filters.grouping}
    />
  );
}
