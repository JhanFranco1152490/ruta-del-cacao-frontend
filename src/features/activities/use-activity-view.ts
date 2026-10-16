'use client';

import { parseAsInteger, parseAsStringLiteral, useQueryState } from 'nuqs';

import { useIsDesktop } from '@/hooks/use-is-desktop';
import { shiftDays, weekStart } from '@/lib/format/dates';

import { DEFAULT_PENDING_DAYS, isPendingDays } from './activity-pending';
import {
  ACTIVITY_VIEWS,
  type ActivityView,
  initialActivityView,
} from './activity-view';
import { parseAsIsoDate } from './iso-date-parser';
import type { useMonthParam } from '@/hooks/use-month-param';

type ActivityPeriod = ReturnType<typeof useMonthParam>;

// La vista, la semana y los días de Pendientes viven en la URL (`?vista=semana&semana=2026-10-12`,
// `?dias=30`), como el
// mes. Sin `vista` se abre la del tamaño de la pantalla; sin `semana`, la semana de hoy, que no se
// escribe en la dirección. Cualquier día de `semana` vale: se muestra la semana que lo contiene.
export function useActivityView(period: ActivityPeriod) {
  const isDesktop = useIsDesktop();
  const [selectedView, setSelectedView] = useQueryState(
    'vista',
    parseAsStringLiteral(ACTIVITY_VIEWS),
  );
  const [selectedWeek, setSelectedWeek] = useQueryState(
    'semana',
    parseAsIsoDate,
  );
  const [selectedDays, setSelectedDays] = useQueryState('dias', parseAsInteger);

  const thisWeek = weekStart(period.today);
  const week = selectedWeek ? weekStart(selectedWeek) : thisWeek;
  const view = selectedView ?? initialActivityView(isDesktop);
  // Cuántos días hacia adelante cuenta Pendientes; un número que no es de la lista cae al de siempre.
  const pendingDays =
    selectedDays !== null && isPendingDays(selectedDays)
      ? selectedDays
      : DEFAULT_PENDING_DAYS;
  const goToWeek = (monday: string) =>
    setSelectedWeek(monday === thisWeek ? null : monday);

  // Al cambiar de vista se conserva el periodo que se estaba mirando: de Mes a Semana, la primera
  // semana de ese mes; de Semana a Mes, el mes donde cae la mayor parte de la semana.
  const setView = (next: ActivityView) => {
    if (next === 'semana' && selectedWeek === null && !period.isCurrentMonth) {
      goToWeek(weekStart(`${period.month}-01`));
    }
    if (next === 'mes' && view === 'semana') {
      period.goToMonth(shiftDays(week, 3).slice(0, 7));
    }
    return setSelectedView(next);
  };

  return {
    view,
    setView,
    week,
    isCurrentWeek: week === thisWeek,
    pendingDays,
    setPendingDays: (days: number) =>
      setSelectedDays(days === DEFAULT_PENDING_DAYS ? null : days),
    goPreviousWeek: () => goToWeek(shiftDays(week, -7)),
    goNextWeek: () => goToWeek(shiftDays(week, 7)),
    goThisWeek: () => setSelectedWeek(null),
  };
}
