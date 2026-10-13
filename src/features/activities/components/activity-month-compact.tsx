'use client';

import { useMemo } from 'react';

import { formatMonthYear, monthGridDates } from '@/lib/format/dates';

import { canScheduleOn } from '../activity-actions';
import type { ActivityDay, ActivityOfDay } from '../activity-days';
import { type DayKeyboard, useGridNavigation } from '../use-grid-navigation';
import { ActivityCompactCell } from './activity-compact-cell';
import { ActivityDayAgenda } from './activity-day-agenda';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const WEEKDAY_NAMES = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
];

// El mes en un celular: una cuadrícula chica con un marcador por actividad y, debajo, las
// actividades del día elegido. Es lo que una cuadrícula con fichas no puede ser en una pantalla de
// 390 px. Tocar un día (o Enter sobre él) lo elige; el teclado es el de `useGridNavigation`.
export function ActivityMonthCompact({
  month,
  today,
  days,
  selectedDate,
  onSelectDate,
  onSelect,
  onScheduleDay,
  keyboard,
}: {
  month: string;
  today: string;
  days: readonly ActivityDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onSelect: (item: ActivityOfDay) => void;
  // Programar en un día; sin él (sin permiso o sin conexión) no se ofrece.
  onScheduleDay?: (date: string) => void;
  // Pasar de mes con el teclado al salir por una flecha, y dónde queda el foco.
  keyboard?: DayKeyboard;
}) {
  const weeks = useMemo(() => monthGridDates(month), [month]);
  const byDate = useMemo(
    () => new Map(days.map((day) => [day.date, day.activities])),
    [days],
  );
  const navigation = useGridNavigation({
    ...keyboard,
    month,
    today,
    onActivate: (date) => {
      onSelectDate(date);
      return true;
    },
  });
  const canScheduleSelected =
    !!onScheduleDay && canScheduleOn(selectedDate, today);

  return (
    <div className="space-y-4">
      <div
        aria-label={`Calendario de ${formatMonthYear(month)}`}
        className="overflow-hidden rounded-xl border-r border-b border-border shadow-card"
        role="grid"
      >
        <div className="grid grid-cols-7 bg-surface-alt" role="row">
          {WEEKDAYS.map((short, index) => (
            <div
              aria-label={WEEKDAY_NAMES[index]}
              className="py-1.5 text-center text-xs font-extrabold text-muted-foreground"
              key={WEEKDAY_NAMES[index]}
              role="columnheader"
            >
              {short}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div className="grid grid-cols-7" key={week[0].date} role="row">
            {week.map(({ date, inMonth }) => (
              <ActivityCompactCell
                activities={byDate.get(date) ?? []}
                cellRef={navigation.register(date)}
                date={date}
                inMonth={inMonth}
                isSelected={inMonth && date === selectedDate}
                isTabStop={inMonth && date === navigation.tabStop}
                isToday={date === today}
                key={date}
                onFocus={() => inMonth && navigation.onFocus(date)}
                onKeyDown={(event) => navigation.onKeyDown(event, date)}
                onSelectDay={onSelectDate}
              />
            ))}
          </div>
        ))}
      </div>
      <ActivityDayAgenda
        date={selectedDate}
        isToday={selectedDate === today}
        items={byDate.get(selectedDate) ?? []}
        onSchedule={canScheduleSelected ? onScheduleDay : undefined}
        onSelect={onSelect}
      />
    </div>
  );
}
