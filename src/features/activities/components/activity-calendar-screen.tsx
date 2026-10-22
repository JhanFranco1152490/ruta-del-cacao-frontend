'use client';

import { type ComponentProps, type ReactNode, useState } from 'react';

import { PageHeader } from '@/components/page-header';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useSession } from '@/hooks/use-session';
import { useActivityAssignees } from '@/lib/api/activity-assignees';
import { onlyFarmOf } from '@/lib/farm-scope';

import { filterCalendar } from '../calendar-filtering';
import { isPeriodView } from '../activity-view';
import type { AgriculturalActivity } from '../api';
import type { PendingDialog } from '../activity-dialog-state';
import { AssigneesContext } from '../assignees';
import { useActivityDay } from '../use-activity-day';
import { useActivityFilters } from '../use-activity-filters';
import { useMonthParam } from '@/hooks/use-month-param';
import { useLinkedActivity } from '../use-linked-activity';
import { useActivityView } from '../use-activity-view';
import { useCalendarData } from '../use-calendar-data';
import { useCalendarKeyboard } from '../use-calendar-keyboard';
import { useCalendarScheduling } from '../use-calendar-scheduling';
import { ActivityCalendarBody } from './activity-calendar-body';
import {
  CalendarLoadState,
  CalendarStatusNotes,
} from './activity-calendar-states';
import { ActivityDialogs } from './activity-dialogs';
import { ActivityCalendarFilters } from './activity-calendar-filters';
import {
  CalendarPeriodRow,
  CalendarViewRow,
} from './activity-calendar-toolbar';
import { ActivityPeriodSlider } from './activity-period-slider';
import { ActivityScheduleFab } from './activity-schedule-fab';
import { ActivityTypeBreakdown } from './activity-type-breakdown';
import { LinkedScheduleDialog } from './linked-schedule-dialog';
import { pageContainerClass } from '@/components/page-container';

// Un aviso de otro dominio arriba de las vistas. Recibe el productor que se ve y cómo abrir el
// detalle de una actividad.
export type CalendarNoticeRenderer = (context: {
  producer: string | null;
  openActivity: (activityId: string) => void;
}) => ReactNode;

export function ActivityCalendarScreen({
  closingResources,
  monitoringHref,
  renderActivityDetails,
  queuedActivities,
  renderNotice,
}: {
  // Los recursos de otros dominios que, en la cola, cierran una actividad (el resultado de un
  // monitoreo): mientras esperan conexión, la actividad se ve realizada.
  closingResources?: readonly string[];
  // La pantalla donde se registra el resultado de un monitoreo, que es de otro dominio.
  monitoringHref?: (activityId: string) => string;
  // Lo que otro dominio agrega al detalle de una actividad.
  renderActivityDetails?: ComponentProps<
    typeof ActivityDialogs
  >['renderDetails'];
  // Las actividades de otro dominio creadas en este dispositivo que esperan conexión.
  queuedActivities?: readonly AgriculturalActivity[];
  // Un aviso de otro dominio arriba de las vistas (las detecciones que esperan un control).
  renderNotice?: CalendarNoticeRenderer;
} = {}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const isDesktop = useIsDesktop();
  const period = useMonthParam();
  const { month, today, goToMonth } = period;
  const viewState = useActivityView(period);
  const selectedDay = useActivityDay(month, today);
  const { view, week } = viewState;
  const filterState = useActivityFilters(user?.id);
  const { filters } = filterState;
  // La cuenta técnica ve las actividades de todos los productores y puede quedarse con uno.
  const superuser = user?.is_superuser === true;
  const producer = superuser ? filterState.producer : null;

  const data = useCalendarData({
    userId: user?.id,
    view,
    month,
    week,
    today,
    producer,
    closingResources,
    queuedActivities,
  });
  // Sin productor elegido la cuenta técnica no tiene una lista de responsables: sale de las
  // actividades que se ven.
  const assignees = useActivityAssignees(user?.id, producer, {
    enabled: !superuser || producer !== null,
  });

  const offline = !hasConnection || data.savedAt !== undefined;
  const loaded = !data.isPending && !data.neverLoaded && data.error === null;
  const { filtered, filtersSet, summary, barFiltersSet } = filterCalendar(
    data.items,
    filters,
    view,
  );
  const activities = data.items.map(({ activity }) => activity);

  const keyboard = useCalendarKeyboard({
    week,
    isDesktop,
    goToMonth,
    goPreviousWeek: viewState.goPreviousWeek,
    goNextWeek: viewState.goNextWeek,
    selectDay: selectedDay.setDay,
  });
  const [pending, setPending] = useState<PendingDialog>();
  const open = (dialog: PendingDialog) => setPending(dialog);
  useLinkedActivity({
    userId: user?.id,
    items: filtered,
    loaded: !data.isPending && data.error === null,
    month,
    goToMonth,
    onOpen: (id) => open({ kind: 'detail', id }),
  });

  const scheduling = useCalendarScheduling({
    ready: !data.isPending,
    offline,
    hasConnection,
    open,
  });
  const { canSchedule } = scheduling;
  const inMonthView = view === 'mes' || view === 'lista' || view === 'parcela';
  const showFilters =
    (superuser || data.items.length > 0 || filtersSet) && !data.neverLoaded;
  // Deslizar el dedo cambia de mes o de semana. En escritorio la tabla de Por parcela se desplaza
  // sola de lado a lado, y Pendientes no tiene periodo.
  const swipeEnabled = isPeriodView(view) && !(view === 'parcela' && isDesktop);

  return (
    <AssigneesContext value={assignees.data?.data}>
      <div className={pageContainerClass('wide', 'pb-24 sm:pb-6')}>
        <PageHeader
          tone="selva"
          accent="hoja"
          description="Programa las labores de tus parcelas y registra lo que se hizo."
          eyebrow="Manejo agrícola"
          title="Actividades"
        />
        <CalendarStatusNotes
          missingMonths={data.missingMonths}
          showingCopy={offline && loaded}
        />
        <div className="mt-4 space-y-3">
          {renderNotice?.({
            producer,
            openActivity: (id) => open({ kind: 'detail', id }),
          })}
          <CalendarViewRow
            scheduling={
              canSchedule && isDesktop
                ? {
                    offline,
                    onSchedule: scheduling.openScheduleForm,
                    onScheduleMonitoring: scheduling.openMonitoringForm,
                  }
                : undefined
            }
            switcher={{ onChange: viewState.setView, value: view }}
          />
          {showFilters && (
            <ActivityCalendarFilters
              activities={activities}
              assignees={assignees.data?.data}
              barFiltersSet={barFiltersSet}
              filterState={filterState}
              filtersSet={filtersSet}
              isDesktop={isDesktop}
              onlyFarm={onlyFarmOf(user)}
              producer={producer}
              superuser={superuser}
            />
          )}
          {isPeriodView(view) && (
            <CalendarPeriodRow
              period={{ period, view, viewState }}
              pills={
                loaded && data.items.length > 0
                  ? {
                      counts: summary.byState,
                      onState: filterState.setState,
                      state: filters.state,
                      total: summary.total,
                    }
                  : undefined
              }
            />
          )}
          <ActivityPeriodSlider
            enabled={swipeEnabled}
            onNext={viewState.periodNavigation.next}
            onPrevious={viewState.periodNavigation.previous}
            periodKey={viewState.periodNavigation.key}
            ready={loaded}
            scope={view}
          >
            <CalendarLoadState
              failed={data.error !== null}
              isPending={data.isPending}
              neverLoaded={data.neverLoaded}
              onGoToday={viewState.periodNavigation.goToday}
              onRetry={data.refetch}
              view={view}
            />
            {loaded && (
              <ActivityCalendarBody
                canSchedule={canSchedule}
                hasFilters={filtersSet}
                isDesktop={isDesktop}
                items={filtered}
                keyboard={keyboard}
                month={month}
                offline={offline}
                onClear={filterState.clear}
                onOpenDay={(date, plotId) =>
                  open({ kind: 'day', date, plotId })
                }
                onSchedule={scheduling.openScheduleForm}
                onScheduleDay={scheduling.scheduleOnDay}
                onSelect={({ activity }) =>
                  open({ kind: 'detail', id: activity.id })
                }
                onPendingDays={viewState.setPendingDays}
                onSelectDay={selectedDay.setDay}
                pendingDays={viewState.pendingDays}
                selectedDay={selectedDay.day}
                today={today}
                unfilteredCount={data.items.length}
                view={view}
                week={week}
              />
            )}
          </ActivityPeriodSlider>
          {loaded && isPeriodView(view) && (
            <ActivityTypeBreakdown rows={summary.byType} />
          )}
        </div>
        {canSchedule && !isDesktop && (
          <ActivityScheduleFab
            offline={offline}
            onClick={scheduling.openScheduleForm}
            onScheduleMonitoring={scheduling.openMonitoringForm}
          />
        )}
        {scheduling.linkedSchedule && (
          <LinkedScheduleDialog
            currentMonth={month}
            link={scheduling.linkedSchedule}
            onClose={scheduling.closeLinkedSchedule}
            onGoToMonth={goToMonth}
          />
        )}
        <ActivityDialogs
          items={filtered}
          offline={offline}
          currentMonth={month}
          monitoringHref={monitoringHref}
          renderDetails={renderActivityDetails}
          onGoToMonth={inMonthView ? goToMonth : undefined}
          onPending={setPending}
          pending={pending}
          today={today}
        />
      </div>
    </AssigneesContext>
  );
}
