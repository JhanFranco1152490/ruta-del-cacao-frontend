import { formatMonthYear, formatWeekRange } from '@/lib/format/dates';

import type { ActivityView } from '../activity-view';
import type { useMonthParam } from '@/hooks/use-month-param';
import type { useActivityView } from '../use-activity-view';
import { PeriodBar } from '@/components/period-bar';

// El control de lo que se mira, según la vista: el mes o la semana. Va pegado a su calendario,
// junto a los recuentos.
export function ActivityPeriodControl({
  view,
  period,
  viewState,
}: {
  view: ActivityView;
  period: ReturnType<typeof useMonthParam>;
  viewState: ReturnType<typeof useActivityView>;
}) {
  // Pendientes no tiene periodo: sus días se eligen dentro de su lista.
  if (view === 'pendientes') return null;
  if (view === 'semana') {
    return (
      <PeriodBar
        isCurrent={viewState.isCurrentWeek}
        nextLabel="Semana siguiente"
        onNext={viewState.goNextWeek}
        onPrevious={viewState.goPreviousWeek}
        onToday={viewState.goThisWeek}
        previousLabel="Semana anterior"
        title={formatWeekRange(viewState.week)}
      />
    );
  }
  return (
    <PeriodBar
      isCurrent={period.isCurrentMonth}
      nextLabel="Mes siguiente"
      onNext={period.goNext}
      onPrevious={period.goPrevious}
      onToday={period.goToday}
      previousLabel="Mes anterior"
      title={formatMonthYear(period.month)}
    />
  );
}
