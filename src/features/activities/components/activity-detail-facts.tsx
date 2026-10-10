import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/status-badge';
import {
  formatDateTime,
  formatWeekdayDate,
  formatWeekdayLongDate,
  shiftDays,
} from '@/lib/format/dates';

import type { ActivityOfDay } from '../activity-days';
import { ACTIVITY_STATE_DISPLAY, activityStateText } from '../activity-labels';
import { OVERDUE_AFTER_DAYS } from '../activity-state';
import type { UsedInput } from '../api';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="font-bold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground first-letter:uppercase">
        {children}
      </dd>
    </>
  );
}

const Aside = ({ children }: { children: ReactNode }) => (
  <span className="text-muted-foreground"> {children}</span>
);

// Todo lo registrado de una actividad. `formatUsedInput` escribe la cantidad de un insumo usado
// con su unidad y su equivalente en empaques: lo sabe el dominio de insumos, no este.
export function ActivityDetailFacts({
  item: { activity, state, daysLate },
  today,
  userId,
  formatUsedInput,
}: {
  item: ActivityOfDay;
  today: string;
  userId: string | undefined;
  formatUsedInput: (used: UsedInput) => string;
}) {
  const { assignee, completed_by: recorder } = activity;
  const done = state === 'done';

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
      <Fact label="Estado">
        <StatusBadge tone={ACTIVITY_STATE_DISPLAY[state].tone}>
          {activityStateText(state, daysLate)}
        </StatusBadge>
      </Fact>
      <Fact label={done ? 'Programada para' : 'Fecha programada'}>
        {formatWeekdayLongDate(activity.scheduled_date)}
        {activity.scheduled_date === today && <Aside>· hoy</Aside>}
      </Fact>
      {done && activity.done_date && (
        <Fact label="Realizada el">
          {formatWeekdayLongDate(activity.done_date)}
        </Fact>
      )}
      <Fact label="Responsable">
        {assignee.full_name}
        {assignee.id === userId && <Aside>(tú)</Aside>}
        {!assignee.is_active && <Aside>· Cuenta inactiva</Aside>}
      </Fact>
      {state === 'delayed' && (
        <Fact label="Vence">
          El{' '}
          {formatWeekdayDate(
            shiftDays(activity.scheduled_date, OVERDUE_AFTER_DAYS),
          )}
          <Aside>· ya no se podrá reprogramar</Aside>
        </Fact>
      )}
      {done && (
        <Fact label="Insumos">
          {activity.inputs.length === 0 ? (
            <span className="text-muted-foreground">Sin insumos</span>
          ) : (
            <ul className="space-y-1">
              {activity.inputs.map((used) => (
                <li
                  className="flex flex-wrap justify-between gap-x-3"
                  key={used.input.id}
                >
                  <span className="font-bold">{used.input.name}</span>
                  <span className="tabular-nums">{formatUsedInput(used)}</span>
                </li>
              ))}
            </ul>
          )}
        </Fact>
      )}
      {done && recorder && activity.completed_at && (
        <Fact label="Registrada por">
          {recorder.full_name}
          <Aside>· {formatDateTime(activity.completed_at)}</Aside>
        </Fact>
      )}
    </dl>
  );
}
