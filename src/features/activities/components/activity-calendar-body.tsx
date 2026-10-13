'use client';

import { useMemo } from 'react';

import { groupItemsByDay, type ActivityOfDay } from '../activity-days';
import { groupPendingActivities } from '../activity-pending';
import { groupActivitiesByPlot } from '../activity-plots';
import type { ActivityView } from '../activity-view';
import { ActivityDayList } from './activity-day-list';
import { ActivityEmpty, ActivityEmptyNote } from './activity-empty';
import { ActivityMonthGrid } from './activity-month-grid';
import { ActivityPendingView } from './activity-pending-view';
import { ActivityPlotCards } from './activity-plot-cards';
import { ActivityPlotTable } from './activity-plot-table';
import { ActivityWeekView } from './activity-week-view';

// La vista del calendario que está abierta, con las actividades que dejaron los filtros. Mes y
// Por parcela tienen forma de escritorio (cuadrícula, tabla) y de celular (la lista, tarjetas):
// la cuadrícula de siete columnas no cabe en una pantalla angosta.
export function ActivityCalendarBody({
  view,
  isDesktop,
  month,
  week,
  today,
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
}: {
  view: ActivityView;
  isDesktop: boolean;
  month: string;
  week: string;
  today: string;
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
}) {
  const days = useMemo(() => groupItemsByDay(items, today), [items, today]);
  const farms = useMemo(() => groupActivitiesByPlot(items), [items]);

  const noneMeetFilters = hasFilters && unfilteredCount > 0;
  // La semana siempre muestra sus siete días, y la cuadrícula del mes sigue ahí aunque esté vacía:
  // sus días sirven para programar. Los demás avisan con un cartel.
  const keepsItsShape = view === 'semana' || (view === 'mes' && isDesktop);
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
      return isDesktop ? (
        <div className="space-y-3">
          {items.length === 0 && (
            <ActivityEmptyNote filtered={noneMeetFilters} onClear={onClear} />
          )}
          <ActivityMonthGrid
            days={days}
            month={month}
            onOpenDay={onOpenDay}
            onScheduleDay={onScheduleDay && ((date) => onScheduleDay(date))}
            onSelect={onSelect}
            today={today}
          />
        </div>
      ) : (
        <ActivityDayList days={days} onSelect={onSelect} />
      );
    case 'semana':
      return (
        <ActivityWeekView
          days={days}
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
