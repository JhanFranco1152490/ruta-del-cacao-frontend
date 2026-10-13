'use client';

import { type KeyboardEvent, useMemo, useRef, useState } from 'react';

import {
  formatMonthYear,
  monthBounds,
  monthGridDates,
  shiftDays,
  weekStart,
} from '@/lib/format/dates';

import { canScheduleOn } from '../activity-actions';
import type { ActivityDay, ActivityOfDay } from '../activity-days';
import { ActivityGridCell } from './activity-grid-cell';

const WEEKDAYS = [
  { short: 'Lun', full: 'lunes' },
  { short: 'Mar', full: 'martes' },
  { short: 'Mié', full: 'miércoles' },
  { short: 'Jue', full: 'jueves' },
  { short: 'Vie', full: 'viernes' },
  { short: 'Sáb', full: 'sábado' },
  { short: 'Dom', full: 'domingo' },
] as const;

// El mes en una cuadrícula de lunes a domingo, con las fichas de cada día. Con el teclado hay una
// sola parada (el día de hoy, o el primero del mes); las flechas mueven por día y por semana, Inicio
// y Fin van a los extremos de la semana, y Enter abre la lista del día.
export function ActivityMonthGrid({
  month,
  today,
  days,
  onSelect,
  onOpenDay,
  onScheduleDay,
}: {
  month: string;
  today: string;
  days: readonly ActivityDay[];
  onSelect: (item: ActivityOfDay) => void;
  onOpenDay: (date: string) => void;
  // Programar una actividad en un día; sin él (sin permiso o sin conexión) los días no lo ofrecen.
  onScheduleDay?: (date: string) => void;
}) {
  const weeks = useMemo(() => monthGridDates(month), [month]);
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day.activities])),
    [days],
  );
  const cells = useRef(new Map<string, HTMLDivElement>());
  const [active, setActive] = useState<string | null>(null);
  const { from: first, to: last } = monthBounds(month);
  const defaultStop = today.startsWith(month) ? today : first;
  const tabStop = active?.startsWith(month) ? active : defaultStop;

  const canScheduleDay = (date: string) =>
    !!onScheduleDay && date.startsWith(month) && canScheduleOn(date, today);
  const clamp = (date: string) =>
    date < first ? first : date > last ? last : date;
  const goTo = (date: string) => {
    setActive(date);
    cells.current.get(date)?.focus();
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>, date: string) {
    // Solo manda la celda; lo que ocurre dentro de una ficha es de la ficha.
    if (event.target !== event.currentTarget) return;
    const moves: Record<string, string> = {
      ArrowLeft: shiftDays(date, -1),
      ArrowRight: shiftDays(date, 1),
      ArrowUp: shiftDays(date, -7),
      ArrowDown: shiftDays(date, 7),
      Home: weekStart(date),
      End: shiftDays(weekStart(date), 6),
    };
    if (event.key in moves) {
      event.preventDefault();
      goTo(clamp(moves[event.key]));
    } else if (event.key === 'Enter') {
      if (byDate.get(date)?.length) {
        event.preventDefault();
        onOpenDay(date);
      } else if (canScheduleDay(date)) {
        event.preventDefault();
        onScheduleDay?.(date);
      }
    }
  }

  return (
    <div
      aria-label={`Calendario de ${formatMonthYear(month)}`}
      className="overflow-hidden rounded-xl border-r border-b border-border shadow-card"
      role="grid"
    >
      <div className="grid grid-cols-7 bg-surface-alt" role="row">
        {WEEKDAYS.map(({ short, full }) => (
          <div
            aria-label={full}
            className="px-2 py-2 text-center text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase"
            key={short}
            role="columnheader"
          >
            {short}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div className="grid grid-cols-7" key={week[0].date} role="row">
          {week.map(({ date, inMonth }) => (
            <ActivityGridCell
              activities={byDate.get(date) ?? []}
              canSchedule={inMonth && canScheduleDay(date)}
              cellRef={(element) => {
                if (element) cells.current.set(date, element);
                else cells.current.delete(date);
              }}
              date={date}
              inMonth={inMonth}
              isTabStop={inMonth && date === tabStop}
              isToday={date === today}
              key={date}
              onFocus={() => inMonth && setActive(date)}
              onKeyDown={(event) => onKeyDown(event, date)}
              onOpenDay={onOpenDay}
              onSchedule={(day) => onScheduleDay?.(day)}
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
