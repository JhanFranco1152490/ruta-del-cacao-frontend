'use client';

import {
  CalendarClock,
  CircleAlert,
  CloudOff,
  TriangleAlert,
} from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { mayRecordFor } from '@/lib/activity-recorders';
import { activityState } from '@/lib/activity-state';
import { formatShortWeekdayDate } from '@/lib/format/dates';

import { monitoringPath } from '../health-paths';
import type { PendingMonitoring } from '../pending-monitorings';
import { useQueuedMonitoring } from '../use-monitoring-queue';

import {
  LINKED_ROW_CLASS,
  ROW_CLASS,
  STRETCHED_LINK_CLASS,
} from './pending-row-class';

const daysText = (days: number) => `${days} ${days === 1 ? 'día' : 'días'}`;

// El estado de un monitoreo por registrar, calculado con la fecha de hoy: la copia guardada puede
// ser de ayer. Lleva ícono y texto además del color.
function stateOf(activity: PendingMonitoring, today: string) {
  const { state, daysLate } = activityState(activity, today);
  if (state === 'overdue') {
    return {
      Icon: CircleAlert,
      tone: 'text-err',
      text: `Vencida · ${daysText(daysLate)}`,
    };
  }
  if (state === 'delayed') {
    return {
      Icon: TriangleAlert,
      tone: 'text-warn',
      text: `Retrasada · ${daysText(daysLate)}`,
    };
  }
  return { Icon: CalendarClock, tone: 'text-selva', text: 'Hoy' };
}

function PendingMonitoringRow({
  activity,
  today,
}: {
  activity: PendingMonitoring;
  today: string;
}) {
  const { data: user } = useSession();
  const queued = useQueuedMonitoring(activity.id);
  const { Icon, tone, text } = stateOf(activity, today);
  // Su resultado ya espera en el teléfono: la labor se hizo, aunque el servidor todavía no lo sepa.
  // Uno que el servidor rechazó sí se vuelve a abrir, para corregirlo.
  const saved = !!queued.data && queued.data.status !== 'error';
  const mayRecord = mayRecordFor(user, activity.assignee.id);

  return (
    <li
      className={`${ROW_CLASS} ${mayRecord && !saved ? LINKED_ROW_CLASS : ''}`}
    >
      <div className="min-w-0">
        <p className="font-bold">
          {activity.plot.code} · {activity.plot.farm.name}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className={`inline-flex items-center gap-1 font-bold ${tone}`}>
            <Icon aria-hidden="true" className="size-4" />
            {text}
          </span>
          <span className="text-muted-foreground">
            {formatShortWeekdayDate(activity.scheduled_date)}
            {!mayRecord && ` · ${activity.assignee.full_name}`}
          </span>
        </p>
      </div>
      {saved ? (
        <p className="flex shrink-0 items-center gap-1 text-sm font-bold text-muted-foreground">
          <CloudOff aria-hidden="true" className="size-4" /> Guardado en el
          teléfono
        </p>
      ) : (
        mayRecord && (
          <EditorLink
            className={buttonVariants({
              size: 'office',
              variant: 'action',
              className: `h-9 shrink-0 text-sm ${STRETCHED_LINK_CLASS}`,
            })}
            href={monitoringPath(activity.id)}
          >
            Registrar
            <span className="sr-only"> monitoreo de {activity.plot.code}</span>
          </EditorLink>
        )
      )}
    </li>
  );
}

// Los monitoreos que todavía no tienen resultado: lo que le toca hacer hoy a quien registra, de
// hoy hacia atrás. Programarlos y ver todos los pendientes sigue siendo del calendario.
export function PendingMonitoringsSection({
  rows,
  today,
}: {
  rows: readonly PendingMonitoring[];
  today: string;
}) {
  if (rows.length === 0) return null;
  return (
    <section
      aria-label="Monitoreos por registrar"
      className="space-y-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card"
    >
      <h2 className="font-sans text-base font-extrabold text-selva">
        Por registrar ({rows.length})
      </h2>
      <ul className="space-y-3">
        {rows.map((activity) => (
          <PendingMonitoringRow
            activity={activity}
            key={activity.id}
            today={today}
          />
        ))}
      </ul>
    </section>
  );
}
