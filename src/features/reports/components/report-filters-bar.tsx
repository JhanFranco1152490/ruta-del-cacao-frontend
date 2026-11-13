'use client';

import { FilterRow } from '@/components/filter-row';
import { InlineError } from '@/components/form-message';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import { AUDIENCE_VIEW_OPTIONS } from '@/lib/audience-view';
import { PERIOD_PRESET_OPTIONS } from '@/lib/period-presets';

import { isWithoutPeriod, REPORT_TYPE_LABELS } from '../report-types';
import type { ReportsScreenState } from '../use-reports-screen';
import { AssociationPlaceFilters } from './association-place-filters';
import { ProducerPlaceFilters } from './producer-place-filters';
import { ReportPeriodFilter } from './report-period-filter';

// Arriba, la vista (solo la cuenta técnica tiene las dos) y los atajos del periodo; debajo, en el
// orden de las demás pantallas, el tipo de reporte (a la vista también en celular), el lugar y las
// fechas, y al final Generar.
export function ReportFiltersBar({ screen }: { screen: ReportsScreenState }) {
  const { filters, view, type, fieldErrors } = screen;
  const withoutPeriod = isWithoutPeriod(type);
  // El tipo y el periodo dicen su error en su campo; los de un lugar, debajo de la fila.
  const placeError =
    fieldErrors.producer ??
    fieldErrors.municipality ??
    fieldErrors.farm ??
    fieldErrors.plot ??
    fieldErrors.lot;
  const { producer, municipality, farm, plot, lot } = filters.values;
  // Los que quedan tras «Filtros» en celular: el lugar y un periodo distinto de este año.
  const activeCount = [
    producer,
    municipality,
    farm,
    plot,
    lot,
    filters.preset !== 'year' && !withoutPeriod,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      {(screen.views.length > 1 || !withoutPeriod) && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {screen.views.length > 1 ? (
            <SegmentedControl
              compact
              label="Vista"
              onChange={(next) => void filters.setView(next)}
              options={AUDIENCE_VIEW_OPTIONS}
              value={view}
            />
          ) : (
            <span />
          )}
          {!withoutPeriod && (
            <div className="max-sm:w-full">
              <SegmentedControl
                compact
                fullWidth
                label="Periodo"
                onChange={(preset) => void filters.setPreset(preset)}
                options={PERIOD_PRESET_OPTIONS}
                value={filters.preset}
              />
            </div>
          )}
        </div>
      )}
      <FilterRow
        activeCount={activeCount}
        compact
        search={
          <SelectField
            className="h-10 text-sm"
            error={fieldErrors.type}
            hideLabel
            label="Tipo de reporte"
            onChange={(event) => void filters.setType(event.target.value)}
            placeholder="Tipo de reporte"
            value={type ?? ''}
            wrapperClassName="w-full sm:w-52"
          >
            {screen.types.map((option) => (
              <option key={option} value={option}>
                {REPORT_TYPE_LABELS[option]}
              </option>
            ))}
          </SelectField>
        }
        trailing={
          <Button
            className="h-10 max-sm:w-full"
            onClick={screen.generate}
            size="office"
            type="button"
          >
            Generar
          </Button>
        }
      >
        {view === 'producer' ? (
          <ProducerPlaceFilters screen={screen} />
        ) : (
          <AssociationPlaceFilters screen={screen} />
        )}
        <ReportPeriodFilter screen={screen} withoutPeriod={withoutPeriod} />
      </FilterRow>
      <InlineError>{placeError}</InlineError>
      {filters.hasFilters && (
        <Button
          className="h-9"
          onClick={() => void filters.clear()}
          size="office"
          type="button"
          variant="ghost"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
