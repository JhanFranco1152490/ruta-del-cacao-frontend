import { cn } from 'cn';
import { CalendarClock, TriangleAlert } from 'lucide-react';

import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatShortDateTime } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { durationText } from '@/lib/format/hours';

import type { Drying } from '../api';
import { cardDetails, expectedWhen } from '../drying-list';
import type { QueuedLog } from '../log-queue';
import { rangeText } from '../moisture';
import { yieldText } from '../yield';

// Los datos del secado en la ficha del lote: en curso, el día, cuánto lleva y si falta la bitácora
// de hoy; terminado, su fin, su duración, las horas de sol y el rendimiento.
export function DryingFacts({
  drying,
  queued,
  now,
}: {
  drying: Drying;
  queued: readonly QueuedLog[];
  now: Date;
}) {
  const { facility, responsible, result } = drying;
  const details = cardDetails(drying, now, queued);
  const TodayIcon = details.missingToday ? TriangleAlert : CalendarClock;

  return (
    <KeyValues>
      <KeyValue label="Marquesina">{facility.name}</KeyValue>
      <KeyValue label="Inicio">
        {formatShortDateTime(drying.started_at)}
      </KeyValue>
      <KeyValue label="Humedad de entrada">
        {formatFixedDecimal(drying.entry_moisture_pct, 1)} %
        {drying.entry_moisture_out_of_range && ' · Fuera del rango esperado'}
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
            {durationText(result.duration_hours)} · {result.days} días
          </KeyValue>
          <KeyValue label="Horas de sol">
            {formatFixedDecimal(result.total_sun_hours, 1)} h
          </KeyValue>
          <KeyValue label="Humedad final">
            {formatFixedDecimal(result.final_moisture_pct, 1)} %
          </KeyValue>
          <KeyValue label="Peso seco">
            {formatFixedDecimal(result.dry_weight_kg, 1)} kg
          </KeyValue>
          <KeyValue label="Rendimiento">
            <span className="font-bold text-selva">
              {yieldText(result.yield_pct)}
            </span>
          </KeyValue>
        </>
      ) : (
        <>
          <KeyValue label="Tiempo">
            Día {details.day} · {details.elapsed}
          </KeyValue>
          <KeyValue label="Meta de humedad">
            {rangeText(drying.target_moisture)}
          </KeyValue>
          <KeyValue label="Fin esperado">
            {expectedWhen(drying.estimated_days)}
          </KeyValue>
          <KeyValue label="Bitácora de hoy">
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                details.missingToday ? 'text-warn' : 'text-selva',
              )}
            >
              <TodayIcon aria-hidden="true" className="size-4 shrink-0" />
              {details.missingToday ? 'Falta registrarla' : 'Al día'}
            </span>
          </KeyValue>
        </>
      )}
    </KeyValues>
  );
}
