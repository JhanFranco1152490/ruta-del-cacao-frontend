import { useMemo } from 'react';

import { monthGridDates } from '@/lib/format/dates';

import type { ActivityDay } from './activity-days';

// Las semanas del mes (de lunes a domingo, con los días vecinos que las completan) y las
// actividades de cada fecha, para las dos vistas de mes del calendario.
export function useMonthDays(month: string, days: readonly ActivityDay[]) {
  const weeks = useMemo(() => monthGridDates(month), [month]);
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day.activities])),
    [days],
  );
  return { weeks, byDate };
}
