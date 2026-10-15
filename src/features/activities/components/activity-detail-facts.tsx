import type { ReactNode } from 'react';

import { StatusBadge } from '@/components/status-badge';
import { useProducerSummary } from '@/lib/api/producer-options';
import {
  formatDateTime,
  formatWeekdayDate,
  formatWeekdayLongDate,
  shiftDays,
} from '@/lib/format/dates';
import { formatStock, inputPackageOf } from '@/lib/format/input-quantity';
import { producerLabelOf } from '@/lib/format/producer';

import type { ActivityOfDay } from '../activity-days';
import { activityBadge } from '../activity-labels';
import { OVERDUE_AFTER_DAYS } from '../activity-state';
import { useAssigneeNote } from '../assignees';

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

// De quién es la actividad: lo ve quien alcanza las de varios productores (la cuenta técnica).
function ProducerFact({ producerId }: { producerId: string }) {
  const { data: producer } = useProducerSummary(producerId);
  return (
    <Fact label="Productor">
      {producer ? producerLabelOf(producer) : 'Cargando…'}
    </Fact>
  );
}

// Todo lo registrado de una actividad.
export function ActivityDetailFacts({
  item,
  today,
  userId,
  showProducer = false,
}: {
  item: ActivityOfDay;
  today: string;
  userId: string | undefined;
  showProducer?: boolean;
}) {
  const { activity, state } = item;
  const badge = activityBadge(item);
  const { assignee, completed_by: recorder } = activity;
  const done = state === 'done';
  const note = useAssigneeNote(activity);

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
      <Fact label="Estado">
        <StatusBadge tone={badge.tone}>{badge.text}</StatusBadge>
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
        {note && <Aside>· {note}</Aside>}
      </Fact>
      {showProducer && <ProducerFact producerId={activity.producer_id} />}
      {state === 'delayed' && item.completion !== 'pending' && (
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
                  <span className="tabular-nums">
                    {formatStock(
                      used.quantity,
                      used.input.unit,
                      inputPackageOf(used.input),
                    )}
                  </span>
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
