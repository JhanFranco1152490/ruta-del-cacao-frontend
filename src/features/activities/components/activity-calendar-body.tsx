'use client';

import { useMemo } from 'react';

import { groupItemsByDay, type ActivityOfDay } from '../activity-days';
import { groupPendingActivities } from '../activity-pending';
import { groupActivitiesByPlot } from '../activity-plots';
import type { ActivityView } from '../activity-view';
import { ActivityDayList } from './activity-day-list';
import { ActivityEmpty, ActivityEmptyNote } from './activity-empty';
import { ActivityMonthCompact } from './activity-month-compact';
import { ActivityMonthGrid } from './activity-month-grid';
import { ActivityPendingView } from './activity-pending-view';
import { ActivityPlotCards } from './activity-plot-cards';
import { ActivityPlotTable } from './activity-plot-table';
import { ActivityWeekView } from './activity-week-view';

// El teclado cruzando de periodo: al salir de un mes o de una semana con una flecha, la pantalla
// cambia de periodo y el foco llega al día vecino (`focusDate`) cuando el periodo nuevo se ve.
export type CalendarKeyboard = {
  focusDate?: string;
  onFocusHandled: () => void;
  onCrossMonth: (date: string) => void;
  onCrossWeek: (date: string) => void;
};

// La vista del calendario que está abierta, con las actividades que dejaron los filtros. Mes y
// Por parcela tienen forma de escritorio (cuadrícula, tabla) y de celular (la lista, tarjetas):
// la cuadrícula de siete columnas no cabe en una pantalla angosta.
export function ActivityCalendarBody({
  view,
  isDesktop,
  month,
  week,
  today,
  selectedDay,
  pendingDays,
  items,
  hasFilters,
  unfilteredCount,
  offline,
  canSchedule,
  onSelect,
  onOpenDay,
  onClear,
  onSchedule,
  onScheduleDay,
  onSelectDay,
  keyboard,
}: {
  view: ActivityView;
  isDesktop: boolean;
  month: string;
  week: string;
  today: string;
  // El día elegido en el mes de un celular, que muestra su agenda.
  selectedDay: string;
  // Cuántos días hacia adelante cuenta Pendientes.
  pendingDays: number;
  // Las que quedan tras los filtros.
  items: readonly ActivityOfDay[];
  hasFilters: boolean;
  // Cuántas había antes de filtrar: distingue "no hay nada" de "los filtros no dejan nada".
  unfilteredCount: number;
  offline: boolean;
  canSchedule: boolean;
  onSelect: (item: ActivityOfDay) => void;
  onOpenDay: (date: string, plotId?: string) => void;
  onClear: () => void;
  onSchedule: () => void;
  // Programar desde un día del calendario (y desde una parcela, en la vista por parcela). Sin él
  // (sin permiso o sin conexión) los días no lo ofrecen.
  onScheduleDay?: (date: string, farmId?: string, plotId?: string) => void;
  onSelectDay: (date: string) => void;
  keyboard?: CalendarKeyboard;
}) {
  const monthKeyboard = keyboard && {
    focusDate: keyboard.focusDate,
    onFocusHandled: keyboard.onFocusHandled,
    onCross: keyboard.onCrossMonth,
  };
  const weekKeyboard = keyboard && {
    focusDate: keyboard.focusDate,
    onFocusHandled: keyboard.onFocusHandled,
    onCross: keyboard.onCrossWeek,
  };
  const days = useMemo(() => groupItemsByDay(items, today), [items, today]);
  const farms = useMemo(() => groupActivitiesByPlot(items), [items]);

  const noneMeetFilters = hasFilters && unfilteredCount > 0;
  // La semana siempre muestra sus siete días, y la cuadrícula del mes (grande o compacta) sigue ahí
  // aunque esté vacía: sus días sirven para programar. Los demás avisan con un cartel.
  const keepsItsShape = view === 'semana' || view === 'mes';
  if (items.length === 0 && !keepsItsShape) {
    if (view !== 'pendientes' || noneMeetFilters) {
      return (
        <ActivityEmpty
          filtered={noneMeetFilters}
          offline={offline}
          onClear={onClear}
          onSchedule={canSchedule ? onSchedule : undefined}
        />
      );
    }
  }

  switch (view) {
    case 'mes':
      return (
        <div className="space-y-3">
          {items.length === 0 && (
            <ActivityEmptyNote filtered={noneMeetFilters} onClear={onClear} />
          )}
          {isDesktop ? (
            <ActivityMonthGrid
              days={days}
              keyboard={monthKeyboard}
              month={month}
              onOpenDay={onOpenDay}
              onScheduleDay={onScheduleDay && ((date) => onScheduleDay(date))}
              onSelect={onSelect}
              today={today}
            />
          ) : (
            <ActivityMonthCompact
              days={days}
              keyboard={monthKeyboard}
              month={month}
              onScheduleDay={onScheduleDay && ((date) => onScheduleDay(date))}
              onSelect={onSelect}
              onSelectDate={onSelectDay}
              selectedDate={selectedDay}
              today={today}
            />
          )}
        </div>
      );
    case 'semana':
      return (
        <ActivityWeekView
          days={days}
          keyboard={weekKeyboard}
          onScheduleDay={onScheduleDay && ((date) => onScheduleDay(date))}
          onSelect={onSelect}
          today={today}
          week={week}
        />
      );
    case 'parcela':
      return isDesktop ? (
        <ActivityPlotTable
          farms={farms}
          month={month}
          onOpenDay={onOpenDay}
          onSchedule={onScheduleDay}
          onSelect={onSelect}
          today={today}
        />
      ) : (
        <ActivityPlotCards farms={farms} onSelect={onSelect} />
      );
    case 'pendientes':
      return (
        <ActivityPendingView
          days={pendingDays}
          groups={groupPendingActivities(items, today, pendingDays)}
          onSelect={onSelect}
        />
      );
    default:
      return <ActivityDayList days={days} onSelect={onSelect} />;
  }
}
