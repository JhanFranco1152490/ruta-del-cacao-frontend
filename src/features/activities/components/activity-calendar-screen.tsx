'use client';

import { CloudOff } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormMessage } from '@/components/form-message';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useSession } from '@/hooks/use-session';
import { formatMonthYear } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  applyActivityFilters,
  assigneeOptionsOf,
  farmOptionsOf,
  hasActivityFilters,
  plotOptionsOf,
} from '../activity-filters';
import { summarizeActivities } from '../activity-summary';
import { isPeriodView } from '../activity-view';
import { useActivityAssignees } from '../api';
import { useActivityDay } from '../use-activity-day';
import { useActivityFilters } from '../use-activity-filters';
import { useActivityMonth } from '../use-activity-month';
import { useActivityView } from '../use-activity-view';
import { useCalendarData } from '../use-calendar-data';
import { ActivityCalendarBody } from './activity-calendar-body';
import {
  ActivityDialogs,
  type ActivityNotice,
  type PendingDialog,
} from './activity-dialogs';
import { ActivityFiltersBar } from './activity-filters-bar';
import { ActivityFiltersToggle } from './activity-filters-toggle';
import { ActivityLegend } from './activity-legend';
import { ActivityPeriodControl } from './activity-period-control';
import { ActivityPeriodSlider } from './activity-period-slider';
import { ActivityScheduleFab } from './activity-schedule-fab';
import { ActivityStatePills } from './activity-state-pills';
import { ActivityTypeBreakdown } from './activity-type-breakdown';
import { ActivityViewSwitch } from './activity-view-switch';
import { ScheduleActivityButton } from './schedule-activity-button';

const NEEDS_CONNECTION = {
  mes: 'Necesitas conexión para ver las actividades de este mes.',
  lista: 'Necesitas conexión para ver las actividades de este mes.',
  parcela: 'Necesitas conexión para ver las actividades de este mes.',
  semana: 'Necesitas conexión para ver las actividades de esta semana.',
  pendientes: 'Necesitas conexión para ver las actividades pendientes.',
} as const;

const STATUS_NOTE_CLASS =
  'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold';

export function ActivityCalendarScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const isDesktop = useIsDesktop();
  const period = useActivityMonth();
  const { month, today, isCurrentMonth, goToMonth } = period;
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
  });
  // Sin productor elegido la cuenta técnica no tiene una lista de responsables: sale de las
  // actividades que se ven.
  const assignees = useActivityAssignees(user?.id, producer, {
    enabled: !superuser || producer !== null,
  });

  const offline = !hasConnection || data.savedAt !== undefined;
  const loaded = !data.isPending && !data.neverLoaded && data.error === null;
  // Pendientes no tiene recuentos de estado desde donde filtrarlo: un estado que quedó en la
  // dirección no debe filtrar a escondidas lo que se ve.
  const activeFilters =
    view === 'pendientes' ? { ...filters, state: null } : filters;
  const filtersSet = hasActivityFilters(activeFilters);
  const filtered = applyActivityFilters(data.items, activeFilters);
  // Los recuentos respetan los demás filtros pero no el de estado, para que los números no cambien
  // al tocarlos.
  const summary = summarizeActivities(
    applyActivityFilters(data.items, { ...filters, state: null }),
  );
  const activities = data.items.map(({ activity }) => activity);
  const assigneeOptions = assigneeOptionsOf([
    ...new Map(
      [
        ...(assignees.data?.data ?? []),
        ...activities.map((activity) => activity.assignee),
      ].map((assignee) => [assignee.id, assignee]),
    ).values(),
  ]);

  // El día que recibe el foco cuando una flecha del teclado cruza de mes o de semana.
  const [focusDate, setFocusDate] = useState<string>();
  const keyboard = {
    focusDate,
    onFocusHandled: () => setFocusDate(undefined),
    onCrossMonth: (date: string) => {
      setFocusDate(date);
      goToMonth(date.slice(0, 7));
      if (!isDesktop) selectedDay.setDay(date);
    },
    onCrossWeek: (date: string) => {
      setFocusDate(date);
      if (date < week) viewState.goPreviousWeek();
      else viewState.goNextWeek();
    },
  };
  const [pending, setPending] = useState<PendingDialog>();
  // Lo último que pasó, en un aviso que leen los lectores de pantalla. Si la actividad quedó en
  // otro mes, la vista no salta: el aviso ofrece ir a verla.
  const [notice, setNotice] = useState<ActivityNotice>();
  const open = (dialog: PendingDialog) => {
    setNotice(undefined);
    setPending(dialog);
  };

  const canSchedule = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const openScheduleForm = () => open({ kind: 'schedule' });
  // Programar desde un día del calendario necesita permiso y conexión.
  const scheduleOnDay =
    canSchedule && !offline
      ? (date: string, farmId?: string, plotId?: string) =>
          open({ kind: 'schedule', date, farmId, plotId })
      : undefined;
  // Cuántos filtros de la barra hay puestos; el estado se ve y se filtra desde los recuentos.
  const barFiltersSet = [filters.farm, filters.plot, filters.assignee].filter(
    Boolean,
  ).length;
  const filtersBar = (
    <ActivityFiltersBar
      assignedToMe={filterState.assignedToMe}
      assigneeOptions={assigneeOptions}
      farmOptions={farmOptionsOf(activities)}
      filters={filters}
      hasFilters={filtersSet}
      onAssignee={filterState.setAssignee}
      onClear={filterState.clear}
      onFarm={filterState.setFarm}
      onPlot={filterState.setPlot}
      onProducer={superuser ? filterState.setProducer : undefined}
      onToggleAssignedToMe={filterState.toggleAssignedToMe}
      plotOptions={plotOptionsOf(activities)}
      producer={producer}
    />
  );
  const inMonthView = view === 'mes' || view === 'lista' || view === 'parcela';
  const showFilters =
    (superuser || data.items.length > 0 || filtersSet) && !data.neverLoaded;
  // Deslizar el dedo cambia de mes o de semana. En escritorio la tabla de Por parcela se desplaza
  // sola de lado a lado, y Pendientes no tiene periodo.
  const swipeEnabled = isPeriodView(view) && !(view === 'parcela' && isDesktop);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-24 sm:px-8 sm:pb-5">
      <PageHeader compact title="Actividades" />
      <div className="mt-3 space-y-2 empty:hidden">
        <FormMessage variant={notice?.variant}>{notice?.message}</FormMessage>
        {inMonthView && notice?.month && notice.month !== month && (
          <Button
            onClick={() => goToMonth(notice.month!)}
            size="office"
            variant="outline"
          >
            Ver en su mes
          </Button>
        )}
        {offline && loaded && (
          <p className={STATUS_NOTE_CLASS} role="status">
            <CloudOff aria-hidden="true" className="size-4 shrink-0" />
            Sin conexión: estás viendo la última copia de las actividades.
          </p>
        )}
        {data.missingMonths.length > 0 && (
          <p className={STATUS_NOTE_CLASS} role="status">
            <CloudOff aria-hidden="true" className="size-4 shrink-0" />
            Necesitas conexión para ver las actividades de{' '}
            {data.missingMonths.map(formatMonthYear).join(' y ')}.
          </p>
        )}
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <ActivityViewSwitch onChange={viewState.setView} value={view} />
          {canSchedule && isDesktop && (
            <ScheduleActivityButton
              offline={offline}
              onClick={openScheduleForm}
            />
          )}
        </div>
        {showFilters &&
          (isDesktop ? (
            filtersBar
          ) : (
            <ActivityFiltersToggle activeCount={barFiltersSet}>
              {filtersBar}
            </ActivityFiltersToggle>
          ))}
        {/* Los recuentos y el periodo van juntos y pegados al calendario. */}
        {view !== 'pendientes' && (
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            {loaded && isPeriodView(view) && data.items.length > 0 && (
              <ActivityStatePills
                counts={summary.byState}
                onState={filterState.setState}
                state={filters.state}
                total={summary.total}
              />
            )}
            <div className="lg:ml-auto">
              <ActivityPeriodControl
                period={period}
                view={view}
                viewState={viewState}
              />
            </div>
          </div>
        )}
        <ActivityPeriodSlider
          enabled={swipeEnabled}
          onNext={view === 'semana' ? viewState.goNextWeek : period.goNext}
          onPrevious={
            view === 'semana' ? viewState.goPreviousWeek : period.goPrevious
          }
          periodKey={view === 'semana' ? week : month}
          ready={loaded}
          scope={view}
        >
          {data.isPending && (
            <div aria-label="Cargando actividades" role="status">
              <Skeleton className="h-64" />
            </div>
          )}
          {data.neverLoaded && (
            <EmptyState
              action={
                inMonthView && !isCurrentMonth ? (
                  <Button
                    onClick={period.goToday}
                    size="office"
                    variant="outline"
                  >
                    Ir a hoy
                  </Button>
                ) : view === 'semana' && !viewState.isCurrentWeek ? (
                  <Button
                    onClick={viewState.goThisWeek}
                    size="office"
                    variant="outline"
                  >
                    Ir a hoy
                  </Button>
                ) : undefined
              }
              description="Cuando tengas conexión, abre esta vista una vez y quedará guardada para consultarla sin conexión."
              title={NEEDS_CONNECTION[view]}
            />
          )}
          {data.error !== null && !data.isPending && (
            <ErrorState
              message="No fue posible cargar las actividades."
              onRetry={data.refetch}
            />
          )}
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
              onOpenDay={(date, plotId) => open({ kind: 'day', date, plotId })}
              onSchedule={() => open({ kind: 'schedule' })}
              onScheduleDay={scheduleOnDay}
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
        {loaded && (
          <>
            {isPeriodView(view) && (
              <ActivityTypeBreakdown rows={summary.byType} />
            )}
            <ActivityLegend />
          </>
        )}
      </div>
      {canSchedule && !isDesktop && (
        <ActivityScheduleFab offline={offline} onClick={openScheduleForm} />
      )}
      <ActivityDialogs
        items={filtered}
        offline={offline}
        onNotice={setNotice}
        onPending={setPending}
        pending={pending}
        today={today}
      />
    </div>
  );
}
