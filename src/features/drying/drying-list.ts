import {
  dateInBogota,
  formatShortDate,
  formatShortDayMonth,
} from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { durationText, hoursBetween } from '@/lib/format/hours';

import type { Drying } from './api';
import {
  dayNumberOf,
  dryingDays,
  logDateOf,
  missingTodayLog,
  totalDays,
} from './drying-days';
import { type QueuedLog, pendingLogsOf } from './log-queue';

// Una bitácora como se muestra: las del servidor y las que esperan en la cola del teléfono, juntas.
type ShownLog = {
  id: string;
  measured_at: string;
  moisture_pct: string;
  day_number: number;
  pending: boolean;
};

export const shownLogs = (
  drying: Drying,
  queued: readonly QueuedLog[],
): ShownLog[] => [
  ...drying.logs.map(({ id, measured_at, moisture_pct, day_number }) => ({
    id,
    measured_at,
    moisture_pct,
    day_number,
    pending: false,
  })),
  ...pendingLogsOf(queued, drying.lot.id).map(({ request }) => ({
    id: request.id,
    measured_at: request.measured_at,
    moisture_pct: request.moisture_pct,
    day_number: dayNumberOf(drying.started_at, request.measured_at),
    pending: true,
  })),
];

// La bitácora de hoy falta cuando ni el servidor ni la cola del teléfono tienen una de hoy. La cola
// cuenta: quien la guardó sin señal no debe ver el aviso de que falta.
export const isMissingToday = (
  drying: Drying,
  now: Date,
  queued: readonly QueuedLog[] = [],
) =>
  missingTodayLog(
    shownLogs(drying, queued).map(({ measured_at }) => logDateOf(measured_at)),
    now,
  );

export const countMissingToday = (
  dryings: readonly Drying[],
  now: Date,
  queued: readonly QueuedLog[] = [],
) => dryings.filter((item) => isMissingToday(item, now, queued)).length;

export type DayStatus = 'logged' | 'queued' | 'today' | 'missing';

// Lo que dice el tooltip de cada día de la línea: la fecha y su humedad, o por qué no hay.
export function dayLabel(
  day: { day: number; date: string; status: DayStatus },
  moisture: string | null,
) {
  const date = formatShortDate(day.date);
  switch (day.status) {
    case 'logged':
      return `Día ${day.day} · ${date} · Humedad ${formatFixedDecimal(moisture ?? '0', 1)} %`;
    case 'queued':
      return `Día ${day.day} · ${date} · Humedad ${formatFixedDecimal(moisture ?? '0', 1)} % · Pendiente de enviar`;
    case 'today':
      return `Día ${day.day} · hoy · Falta la bitácora`;
    default:
      return `Día ${day.day} · ${date} · Sin bitácora`;
  }
}

// Todo lo que dibujan las tarjetas de un lote en secado, ya resuelto con el reloj del dispositivo y
// con las bitácoras del servidor y las de la cola juntas: el día, cuánto lleva, la última humedad y
// un punto por día del secado, con y sin bitácora.
export function cardDetails(
  drying: Drying,
  now: Date,
  queued: readonly QueuedLog[] = [],
) {
  const logs = shownLogs(drying, queued);
  const byDay = new Map(logs.map((log) => [log.day_number, log]));
  const today = dateInBogota(now.toISOString());
  const last = logs
    .toSorted((a, b) => a.measured_at.localeCompare(b.measured_at))
    .at(-1);
  const days = dryingDays(
    drying.started_at,
    totalDays({
      startedAt: drying.started_at,
      now,
      logDays: logs.map(({ day_number }) => day_number),
    }),
    logs,
  ).map(({ day, date, log }) => {
    const status: DayStatus = log
      ? log.pending
        ? 'queued'
        : 'logged'
      : date === today
        ? 'today'
        : 'missing';
    const moisture = byDay.get(day)?.moisture_pct ?? null;
    return {
      day,
      date,
      status,
      label: dayLabel({ day, date, status }, moisture),
    };
  });

  return {
    day: dayNumberOf(drying.started_at, now),
    elapsed: durationText(
      Math.max(hoursBetween(drying.started_at, now.toISOString()), 0),
    ),
    logCount: logs.length,
    last: last
      ? {
          moisture: last.moisture_pct,
          at: last.measured_at,
          day: last.day_number,
          pending: last.pending,
        }
      : null,
    missingToday: isMissingToday(drying, now, queued),
    days,
  };
}

// Cuándo se espera que termine, según los días que el productor estima.
export const expectedWhen = ({ min, max }: Drying['estimated_days']) =>
  min === max ? `El día ${min}` : `Entre el día ${min} y el ${max}`;

export const expectedDaysText = (days: Drying['estimated_days']) =>
  `Se espera ${expectedWhen(days).replace(/^E/, 'e')}`;

// «Última humedad: 12,4 % · día 2 · 23 oct».
export const lastLogLine = (
  last: NonNullable<ReturnType<typeof cardDetails>['last']>,
) =>
  [
    `${formatFixedDecimal(last.moisture, 1)} %`,
    `día ${last.day}`,
    formatShortDayMonth(last.at),
    ...(last.pending ? ['Pendiente de enviar'] : []),
  ].join(' · ');
