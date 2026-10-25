import { dayNumberOf, dryingDays, totalDays } from './drying-days';
import type { Drying, DryingLog, Weather } from './api';
import { pendingLogsOf, type QueuedLog } from './log-queue';

// Una fila de la tabla de bitácoras de la ficha: un día de secado, con su bitácora o sin ella.
// `log` es la del servidor: solo esas se corrigen o se eliminan; la que espera en la cola del
// teléfono se ve en su día, pendiente de enviar.
export type LogRow = {
  day: number;
  date: string;
  empty: boolean;
  id: string | null;
  measuredAt: string | null;
  moisture: string | null;
  sunHours: string | null;
  shadeHours: string | null;
  turnCount: number | null;
  turnFrequency: string | null;
  weather: Weather | null;
  notes: string;
  recordedBy: string | null;
  pending: boolean;
  log?: DryingLog;
};

const emptyRow = (day: number, date: string): LogRow => ({
  day,
  date,
  empty: true,
  id: null,
  measuredAt: null,
  moisture: null,
  sunHours: null,
  shadeHours: null,
  turnCount: null,
  turnFrequency: null,
  weather: null,
  notes: '',
  recordedBy: null,
  pending: false,
});

// Los días del secado, del 1 al último, cada uno con su bitácora (la del servidor o la de la cola)
// o vacío. Terminado, son los días de su resultado; en curso, hasta hoy o hasta el último día con
// bitácora.
export function logRows(
  drying: Drying,
  queued: readonly QueuedLog[],
  now: Date,
): LogRow[] {
  const pending = pendingLogsOf(queued, drying.lot.id).map(({ request }) => ({
    request,
    day_number: dayNumberOf(drying.started_at, request.measured_at),
  }));
  const days = dryingDays(
    drying.started_at,
    totalDays({
      startedAt: drying.started_at,
      now,
      logDays: [
        ...drying.logs.map(({ day_number }) => day_number),
        ...pending.map(({ day_number }) => day_number),
      ],
      resultDays: drying.result?.days,
    }),
    drying.logs,
  );
  return days.map(({ day, date, log }) => {
    if (log) {
      return {
        day,
        date,
        empty: false,
        id: log.id,
        measuredAt: log.measured_at,
        moisture: log.moisture_pct,
        sunHours: log.sun_hours,
        shadeHours: log.shade_hours,
        turnCount: log.turn_count,
        turnFrequency: log.turn_frequency_hours,
        weather: log.weather,
        notes: log.notes,
        recordedBy: log.recorded_by.full_name,
        pending: false,
        log,
      };
    }
    const waiting = pending.find(({ day_number }) => day_number === day);
    if (!waiting) return emptyRow(day, date);
    const { request } = waiting;
    return {
      ...emptyRow(day, date),
      empty: false,
      id: request.id,
      measuredAt: request.measured_at,
      moisture: request.moisture_pct,
      sunHours: request.sun_hours,
      shadeHours: request.shade_hours ?? null,
      turnCount: request.turn_count,
      turnFrequency: request.turn_frequency_hours ?? null,
      weather: request.weather,
      notes: request.notes ?? '',
      pending: true,
    };
  });
}
