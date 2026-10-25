'use client';

import { FILTER_CONTROLS_CLASS } from '@/components/filter-row';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { SegmentedControl } from '@/components/segmented-control';

// Las pestañas (solo para quien puede iniciar) y la finca (solo con varias) de una pantalla de
// poscosecha, en una fila.
export function ProcessToolbar<View extends string>({
  viewLabel,
  views,
  view,
  onView,
  farm,
  farmOptions,
  onFarm,
}: {
  viewLabel: string;
  views: readonly { value: View; label: string }[];
  view: View;
  // Falta para quien solo registra: no ve la pestaña de listos.
  onView?: (view: View) => void;
  farm: SearchSelectOption | null;
  farmOptions: readonly SearchSelectOption[];
  onFarm: (farm: string | null) => void;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${FILTER_CONTROLS_CLASS}`}
    >
      {onView && (
        <SegmentedControl<View>
          compact
          fullWidth
          label={viewLabel}
          onChange={onView}
          options={views}
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
