import { cn } from 'cn';
import { CalendarClock, TriangleAlert } from 'lucide-react';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatShortDateTime } from '@/lib/format/dates';

import type { Fermentation } from '../api';
import { cardFacts } from '../fermentation-list';
import { durationText } from '@/lib/format/hours';
import type { QueuedTurn } from '../turn-queue';

// Los datos de la fermentación en la ficha del lote: en curso, cuánto lleva y cuándo toca el
// próximo volteo; terminada, su fin, su duración y lo que se observó.
export function FermentationFacts({
  fermentation,
  queued,
  now,
}: {
  fermentation: Fermentation;
  queued: readonly QueuedTurn[];
  now: Date;
}) {
  const { facility, responsible, result } = fermentation;
  const facts = cardFacts(fermentation, now, queued);
  const NextIcon = facts.next.overdue ? TriangleAlert : CalendarClock;

  return (
    <KeyValues>
      <KeyValue label="Cajón">
        {fermentation.over_capacity
          ? `${facility.name} · Superó la capacidad`
          : facility.name}
      </KeyValue>
      <KeyValue label="Inicio">
        {formatShortDateTime(fermentation.started_at)}
      </KeyValue>
      <KeyValue label="Responsable">
        {responsible.is_active
          ? responsible.full_name
          : `${responsible.full_name} (Cuenta inactiva)`}
      </KeyValue>
      {result ? (
        <>
          <KeyValue label="Fin">
            {formatShortDateTime(result.ended_at)}
          </KeyValue>
          <KeyValue label="Duración">
            {durationText(result.duration_hours)}
          </KeyValue>
          <KeyValue label="Observaciones">{result.notes || '—'}</KeyValue>
        </>
      ) : (
        <>
          <KeyValue label="Tiempo">{facts.elapsed}</KeyValue>
          <KeyValue label="Volteos">
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                facts.next.overdue ? 'text-warn' : 'text-selva',
              )}
            >
              <NextIcon aria-hidden="true" className="size-4 shrink-0" />
              {facts.next.text}
            </span>
          </KeyValue>
        </>
      )}
    </KeyValues>
  );
}
