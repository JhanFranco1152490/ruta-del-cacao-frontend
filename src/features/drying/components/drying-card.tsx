import { CalendarClock, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';

import { farmLabel } from '@/lib/format/place-label';

import type { Drying } from '../api';
import { cardDetails, expectedDaysText, lastLogLine } from '../drying-list';
import type { QueuedLog } from '../log-queue';
import { DayTimeline } from './day-timeline';
import { DryingCardActions } from './drying-card-actions';

// Un lote en secado: dónde está, un punto por cada día de secado, cuánto lleva, su última humedad y
// si falta la bitácora de hoy. Lo que falta lleva ícono y texto además del color.
export function DryingCard({
  drying,
  now,
  queued,
  lotHref,
}: {
  drying: Drying;
  now: Date;
  // Las bitácoras que siguen en la cola del teléfono, de cualquier lote.
  queued: readonly QueuedLog[];
  lotHref: (id: string) => string;
}) {
  const { lot, farm, facility } = drying;
  const details = cardDetails(drying, now, queued);
  const { last, missingToday } = details;
  const MissingIcon = missingToday ? TriangleAlert : CalendarClock;

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
      <div className="min-w-0 space-y-0.5">
        <p className="font-mono font-bold break-all">{lot.code}</p>
        <p className="text-sm text-muted-foreground">
          {farmLabel(farm)} · {facility.name}
        </p>
      </div>
      <DayTimeline days={details.days} />
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-bold text-selva">Día {details.day}</span> de
          secado · lleva {details.elapsed}
        </p>
        <p>
          <span className="font-bold text-selva">
            {last ? lastLogLine(last) : 'Sin bitácoras todavía'}
          </span>
          <span className="block text-xs text-muted-foreground">
            {expectedDaysText(drying.estimated_days)}
          </span>
        </p>
        <p
          className={cn(
            'flex items-center gap-1.5 text-sm font-bold',
            missingToday ? 'text-warn' : 'text-selva',
          )}
        >
          <MissingIcon aria-hidden="true" className="size-4 shrink-0" />
          {missingToday ? 'Falta la bitácora de hoy' : 'Bitácora de hoy al día'}
        </p>
      </div>
      <DryingCardActions drying={drying} lotHref={lotHref} />
    </li>
  );
}
