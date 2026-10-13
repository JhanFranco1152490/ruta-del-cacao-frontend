import { Plus } from 'lucide-react';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import {
  formatWeekdayDate,
  formatWeekRange,
  weekDates,
} from '@/lib/format/dates';

import { canScheduleOn } from '../activity-actions';
import type { ActivityDay, ActivityOfDay } from '../activity-days';
import { type DayKeyboard, useWeekNavigation } from '../use-grid-navigation';
import { ActivityChip } from './activity-chip';

// Una semana de lunes a domingo con las fichas completas de cada día, sin el corte de tres de la
// cuadrícula del mes. Muestra los siete días aunque estén vacíos: en una semana importa ver dónde
// no hay nada. En pantallas angostas los días van uno bajo otro. Con el teclado, cada día es una
// parada y las flechas izquierda y derecha pasan de uno a otro; después del domingo (o antes del
// lunes) pasan a la semana vecina.
export function ActivityWeekView({
  week,
  today,
  days,
  onSelect,
  onScheduleDay,
  keyboard,
}: {
  week: string;
  today: string;
  days: readonly ActivityDay[];
  onSelect: (item: ActivityOfDay) => void;
  // Programar una actividad en un día; sin él (sin permiso o sin conexión) no se ofrece.
  onScheduleDay?: (date: string) => void;
  // Pasar de semana con el teclado al salir por una flecha, y dónde queda el foco.
  keyboard?: DayKeyboard;
}) {
  const navigation = useWeekNavigation({ ...keyboard, week, today });
  const byDate = new Map(days.map((day) => [day.date, day.activities]));

  return (
    <section aria-label={`Semana del ${formatWeekRange(week)}`}>
      <ol className="grid gap-3 md:grid-cols-7 md:gap-0 md:overflow-hidden md:rounded-xl md:border-r md:border-b md:border-border md:shadow-card">
        {weekDates(week).map((date) => {
          const activities = byDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <li
              aria-current={isToday ? 'date' : undefined}
              className={`space-y-2 rounded-xl border border-border bg-card p-2 md:min-h-64 md:rounded-none md:border-0 md:border-t md:border-l ${isToday ? 'border-t-[3px] border-t-cobre md:border-t-[3px]' : ''} ${FOCUS_OUTLINE_CLASS}`}
              key={date}
              onFocus={() => navigation.onFocus(date)}
              onKeyDown={(event) => navigation.onKeyDown(event, date)}
              ref={navigation.register(date)}
              tabIndex={date === navigation.tabStop ? 0 : -1}
            >
              <div className="flex items-center gap-2">
                <h3 className="font-sans text-xs font-extrabold text-selva">
                  {formatWeekdayDate(date)}
                </h3>
                {isToday && (
                  <span className="rounded-full bg-cobre px-2 py-0.5 text-xs font-extrabold tracking-[0.08em] text-primary-foreground uppercase">
                    Hoy
                  </span>
                )}
              </div>
              {activities.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin actividades</p>
              ) : (
                <ul className="space-y-1.5">
                  {activities.map((item) => (
                    <li key={item.activity.id}>
                      <ActivityChip
                        item={item}
                        onSelect={() => onSelect(item)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {onScheduleDay && canScheduleOn(date, today) && (
                <button
                  aria-label={`Programar una actividad el ${formatWeekdayDate(date)}`}
                  className={`flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-selva ${FOCUS_OUTLINE_CLASS}`}
                  onClick={() => onScheduleDay(date)}
                  type="button"
                >
                  <Plus aria-hidden="true" className="size-3.5" />
                  Programar
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
