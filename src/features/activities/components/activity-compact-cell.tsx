import type { KeyboardEvent, Ref } from 'react';

import { TONE_ICONS } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { formatWeekdayDate } from '@/lib/format/dates';

import { type ActivityOfDay, effectiveState } from '../activity-days';
import { ACTIVITY_STATE_DISPLAY } from '../activity-labels';
import type { ActivityState } from '../activity-state';
import { countByState, describeStateCounts } from '../activity-summary';

export const MAX_MARKERS_PER_DAY = 3;

const TONE_TEXT = {
  info: 'text-info',
  warn: 'text-warn',
  err: 'text-err',
  ok: 'text-ok',
} as const;

// Lo más urgente primero: en tres marcadores caben las que más importan.
const URGENCY: Record<ActivityState, number> = {
  overdue: 0,
  delayed: 1,
  scheduled: 2,
  done: 3,
};

// Un día de la cuadrícula compacta del mes (celular): su número y un marcador con el ícono del
// estado por cada actividad, hasta tres y un "+n" si hay más. Tocarlo elige el día. Los de otro
// mes completan la semana y no se eligen. El nombre accesible dice la fecha y el recuento.
export function ActivityCompactCell({
  date,
  inMonth,
  isToday,
  isSelected,
  activities,
  isTabStop,
  cellRef,
  onSelectDay,
  onFocus,
  onKeyDown,
}: {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  activities: readonly ActivityOfDay[];
  isTabStop: boolean;
  cellRef: Ref<HTMLDivElement>;
  onSelectDay: (date: string) => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const states = activities
    .map(effectiveState)
    .toSorted((a, b) => URGENCY[a] - URGENCY[b]);
  const shown = inMonth ? states.slice(0, MAX_MARKERS_PER_DAY) : [];
  const more = inMonth ? states.length - shown.length : 0;
  const summary = describeStateCounts(countByState([...activities]));
  const label = inMonth
    ? `${formatWeekdayDate(date)}${isToday ? ', hoy' : ''}, ${
        activities.length === 0
          ? 'sin actividades'
          : `${activities.length === 1 ? '1 actividad' : `${activities.length} actividades`}: ${summary}`
      }`
    : `${formatWeekdayDate(date)}, de otro mes`;

  return (
    <div
      aria-current={isToday ? 'date' : undefined}
      aria-disabled={inMonth ? undefined : true}
      aria-label={label}
      aria-selected={inMonth ? isSelected : undefined}
      className={`flex h-12 flex-col items-center gap-0.5 border-t border-l border-border px-0.5 pt-1 ${
        inMonth ? 'cursor-pointer bg-card' : 'bg-muted/50 text-muted-foreground'
      } ${isSelected ? 'bg-selva/10' : ''} ${FOCUS_OUTLINE_CLASS}`}
      onClick={inMonth ? () => onSelectDay(date) : undefined}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      ref={cellRef}
      role="gridcell"
      tabIndex={isTabStop ? 0 : -1}
    >
      <span
        className={`grid size-6 place-items-center rounded-full text-xs font-extrabold ${
          isSelected
            ? 'bg-selva text-primary-foreground'
            : isToday
              ? 'ring-2 ring-cobre'
              : ''
        }`}
      >
        {Number(date.slice(8))}
      </span>
      <span aria-hidden="true" className="flex items-center gap-px">
        {shown.map((state, index) => {
          const { tone } = ACTIVITY_STATE_DISPLAY[state];
          const Icon = TONE_ICONS[tone];
          return (
            <Icon
              className={`size-3 ${TONE_TEXT[tone]}`}
              key={`${state}-${index}`}
            />
          );
        })}
        {more > 0 && (
          <span className="text-[10px] font-extrabold text-muted-foreground">
            +{more}
          </span>
        )}
      </span>
    </div>
  );
}
