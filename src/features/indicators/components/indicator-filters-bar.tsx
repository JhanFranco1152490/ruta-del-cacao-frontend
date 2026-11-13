'use client';

import { FarmFilter } from '@/components/farm-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { SegmentedControl } from '@/components/segmented-control';

import { INDICATOR_PERIOD_OPTIONS } from '../indicator-period';
import { INDICATOR_VIEW_OPTIONS, type IndicatorView } from '../indicator-view';
import type { IndicatorsScreenState } from '../use-indicators-screen';

// Los filtros en el orden de las demás pantallas: el panel (solo la cuenta técnica tiene los dos),
// el productor (también solo ella), la finca (solo en el del productor) y, a la derecha, el periodo.
export function IndicatorFiltersBar({
  screen,
}: {
  screen: IndicatorsScreenState;
}) {
  const { filters, view } = screen;
  const farmId = filters.filters.farm;
  const farmName = screen.producer.data?.production.plots.find(
    ({ farm_id }) => farm_id === farmId,
  )?.farm_name;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3 max-sm:w-full">
        {screen.views.length > 1 && view && (
          <SegmentedControl
            compact
            label="Panel"
            onChange={filters.setView}
            options={INDICATOR_VIEW_OPTIONS.filter(({ value }) =>
              screen.views.includes(value as IndicatorView),
            )}
            value={view}
          />
        )}
        {screen.superuser && view === 'producer' && (
          <ProducerFilter
            className="w-full sm:w-72"
            compact
            hideLabel
            onClear={() => void filters.setProducer(null)}
            onSelect={(id) => void filters.setProducer(id)}
            producer={screen.producerId ?? undefined}
            selected={screen.selectedProducer}
          />
        )}
        {view === 'producer' && !screen.needsProducer && (
          <FarmFilter
            className="w-full sm:w-64"
            compact
            farm={farmId ?? undefined}
            hideLabel
            onClear={() => void filters.clearFarm()}
            onSelect={(farm) => void filters.setFarm(farm.id)}
            producer={screen.producerId ?? undefined}
            selectedLabel={farmName ?? 'Esta finca'}
          />
        )}
      </div>
      <div className="max-sm:w-full">
        <SegmentedControl
          compact
          fullWidth
          label="Periodo"
          onChange={filters.setPeriod}
          options={INDICATOR_PERIOD_OPTIONS}
          value={filters.period}
        />
      </div>
    </div>
  );
}
