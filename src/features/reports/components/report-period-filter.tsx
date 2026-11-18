'use client';

import { DateRangeFilter } from '@/components/date-range-filter';

import type { ReportsScreenState } from '../use-reports-screen';

// Las dos fechas del periodo. El inventario no lleva: son las existencias de hoy.
export function ReportPeriodFilter({
  screen,
  withoutPeriod,
}: {
  screen: ReportsScreenState;
  withoutPeriod: boolean;
}) {
  const { filters } = screen;
  if (withoutPeriod) {
    return (
      <p className="flex h-10 items-center text-sm font-bold text-selva">
        Existencias a hoy
      </p>
    );
  }
  return (
    <DateRangeFilter
      error={screen.fieldErrors.period}
      from={filters.values.from}
      onFrom={(date) => void filters.setFrom(date)}
      onTo={(date) => void filters.setTo(date)}
      to={filters.values.to}
    />
  );
}
