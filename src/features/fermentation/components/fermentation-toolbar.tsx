'use client';

import { FILTER_CONTROLS_CLASS } from '@/components/filter-row';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';

import type { FermentationView } from '../use-fermentation-filters';

// Las pestañas (solo para quien puede iniciar) y la finca (solo con varias), en una fila.
export function FermentationToolbar({
  view,
  onView,
  farm,
  farmOptions,
  onFarm,
}: {
  view: FermentationView;
  // Falta para quien solo registra volteos: no ve la pestaña de listos.
  onView?: (view: FermentationView) => void;
  farm: SearchSelectOption | null;
  farmOptions: readonly SearchSelectOption[];
  onFarm: (farm: string | null) => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-start gap-3 ${FILTER_CONTROLS_CLASS}`}
    >
      {onView && (
        <SegmentedControl<FermentationView>
          fullWidth
          label="Vista de fermentación"
          onChange={onView}
          options={[
            { value: 'en-curso', label: 'En fermentación' },
            { value: 'listos', label: 'Listos para fermentar' },
          ]}
          value={view}
        />
      )}
      {farmOptions.length > 1 && (
        <SearchSelect
          allLabel="Todas las fincas"
          className="w-full sm:w-72"
          compact
          hideLabel
          label="Finca"
          onChange={(option) => onFarm(option?.id ?? null)}
          options={farmOptions}
          value={farm}
        />
      )}
    </div>
  );
}
