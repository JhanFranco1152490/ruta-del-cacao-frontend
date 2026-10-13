import { Plus } from 'lucide-react';
import type { KeyboardEvent, Ref } from 'react';

import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { formatWeekdayDate } from '@/lib/format/dates';

import type { ActivityOfDay } from '../activity-days';
import { activityBadge } from '../activity-labels';
import { ActivityChip } from './activity-chip';

export const MAX_CHIPS_PER_DAY = 3;

export const GRID_CELL_MIN_HEIGHT = 'min-h-24';

const DOT_CLASSES = {
  info: 'bg-info',
  warn: 'bg-warn',
  err: 'bg-err',
  ok: 'bg-ok',
} as const;

function countLabel(count: number) {
  if (count === 0) return 'sin actividades';
  return count === 1 ? '1 actividad' : `${count} actividades`;
}

// Un día de la cuadrícula del mes. Los de otro mes salen atenuados y sin fichas: son solo para
// completar la semana. La celda es la parada del teclado; sus fichas se tocan con el puntero y se
// alcanzan con el teclado desde la lista del día.
export function ActivityGridCell({
  date,
  inMonth,
  isToday,
  activities,
  isTabStop,
  cellRef,
  onFocus,
  onKeyDown,
  onSelect,
  onOpenDay,
  canSchedule,
  onSchedule,
}: {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  activities: readonly ActivityOfDay[];
  isTabStop: boolean;
  cellRef: Ref<HTMLDivElement>;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onSelect: (item: ActivityOfDay) => void;
  onOpenDay: (date: string) => void;
  // Se puede programar una actividad este día (permiso, conexión y que no haya pasado).
  canSchedule: boolean;
  onSchedule: (date: string) => void;
}) {
  const shown = inMonth ? activities.slice(0, MAX_CHIPS_PER_DAY) : [];
  const hidden = inMonth ? activities.slice(MAX_CHIPS_PER_DAY) : [];
  const tones = [...new Set(hidden.map((item) => activityBadge(item).tone))];
  const label = inMonth
    ? `${formatWeekdayDate(date)}${isToday ? ', hoy' : ''}, ${countLabel(activities.length)}`
    : `${formatWeekdayDate(date)}, de otro mes`;

  // Un día vacío es un botón grande para programar en él; uno con actividades ofrece el "+".
  const scheduleOnClick = canSchedule && activities.length === 0;

  return (
    <div
      aria-current={isToday ? 'date' : undefined}
      aria-disabled={inMonth ? undefined : true}
      aria-label={label}
      className={`group ${GRID_CELL_MIN_HEIGHT} space-y-1 border-t border-l border-border p-1.5 ${
        inMonth ? 'bg-card' : 'bg-muted/50 text-muted-foreground'
      } ${isToday ? 'border-t-[3px] border-t-cobre' : ''} ${scheduleOnClick ? 'cursor-pointer hover:bg-muted/60' : ''} ${FOCUS_OUTLINE_CLASS}`}
      onClick={scheduleOnClick ? () => onSchedule(date) : undefined}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      ref={cellRef}
      role="gridcell"
      tabIndex={isTabStop ? 0 : -1}
    >
      <div className="flex items-center gap-1.5 text-xs font-extrabold">
        <span
          className={
            isToday
              ? 'grid size-6 place-items-center rounded-full bg-selva text-primary-foreground'
              : 'px-1'
          }
        >
          {Number(date.slice(8))}
        </span>
        {isToday && <span className="text-cobre uppercase">Hoy</span>}
        {canSchedule && (
          <button
            aria-label={`Programar una actividad el ${formatWeekdayDate(date)}`}
            className={`ml-auto grid size-6 cursor-pointer place-items-center rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-selva focus-visible:opacity-100 ${FOCUS_OUTLINE_CLASS}`}
            onClick={(event) => {
              event.stopPropagation();
              onSchedule(date);
            }}
            tabIndex={-1}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
      {shown.map((item) => (
        <ActivityChip
          item={item}
          key={item.activity.id}
          onSelect={() => onSelect(item)}
          tabIndex={-1}
        />
      ))}
      {hidden.length > 0 && (
        <button
          className={`flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs font-bold text-selva underline-offset-2 hover:bg-muted hover:underline ${FOCUS_OUTLINE_CLASS}`}
          onClick={() => onOpenDay(date)}
          tabIndex={-1}
          type="button"
        >
          <span className="flex gap-0.5" aria-hidden="true">
            {tones.map((tone) => (
              <span
                className={`size-2 rounded-full ${DOT_CLASSES[tone]}`}
                key={tone}
              />
            ))}
          </span>
          +{hidden.length} más
        </button>
      )}
    </div>
  );
}
