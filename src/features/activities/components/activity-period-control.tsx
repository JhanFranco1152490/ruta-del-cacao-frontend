import { formatMonthYear, formatWeekRange } from '@/lib/format/dates';

import type { ActivityView } from '../activity-view';
import type { useActivityMonth } from '../use-activity-month';
import type { useActivityView } from '../use-activity-view';
import { ActivityPendingDays } from './activity-pending-days';
import { ActivityPeriodBar } from './activity-period-bar';

// El control de lo que se mira, según la vista: el mes, la semana o, en Pendientes, cuántos días
// hacia adelante. Va pegado a su calendario, junto a los recuentos.
export function ActivityPeriodControl({
  view,
  period,
  viewState,
}: {
  view: ActivityView;
  period: ReturnType<typeof useActivityMonth>;
  viewState: ReturnType<typeof useActivityView>;
}) {
  if (view === 'pendientes') {
    return (
      <ActivityPendingDays
        days={viewState.pendingDays}
        onDays={viewState.setPendingDays}
      />
    );
  }
  if (view === 'semana') {
    return (
      <ActivityPeriodBar
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
    <ActivityPeriodBar
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
