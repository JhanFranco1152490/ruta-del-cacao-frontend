'use client';

import { FarmFilter } from '@/components/farm-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { useSession } from '@/hooks/use-session';
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
  const groupings: { value: Grouping; label: string }[] = [
    { value: 'ninguno', label: 'Sin agrupar' },
    ...(pickProducer
      ? [{ value: 'productor' as const, label: 'Por productor' }]
      : []),
    { value: 'finca', label: 'Por finca' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <TextField
          label="Buscar parcela"
          onChange={(event) => filters.setSearchInput(event.target.value)}
          placeholder="Código de la parcela"
          type="search"
          value={filters.searchInput}
          wrapperClassName="w-full max-w-md"
        />
        <FarmFilter
          className="w-full sm:w-80"
          farm={filters.farm ?? undefined}
          label="Filtrar por finca"
          onClear={() => void filters.setFarm(null)}
          onSelect={(option) =>
            void filters.setFarm(option.id, option.producer.id)
          }
          producer={filters.producer ?? undefined}
          selectedLabel={filters.farm ? farm.data?.data.name : undefined}
          showProducer={pickProducer}
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
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SelectField
          label="Caracterización"
          onChange={(event) =>
            void filters.setCharacterization(
              (event.target.value || null) as CharacterizationState | null,
            )
          }
          value={filters.characterization ?? ''}
          wrapperClassName="w-full sm:w-56"
        >
          <option value="">Todas</option>
          {(
            Object.keys(CHARACTERIZATION_LABELS) as CharacterizationState[]
          ).map((value) => (
            <option key={value} value={value}>
              {CHARACTERIZATION_LABELS[value]}
            </option>
          ))}
        </SelectField>
        <SegmentedControl
          label="Agrupar"
          onChange={(value) => void filters.setGrouping(value)}
          options={groupings}
          value={filters.grouping}
        />
      </div>
    </div>
  );
}
