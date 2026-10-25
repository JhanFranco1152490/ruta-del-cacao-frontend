import {
  dateInBogota,
  daysBetween,
  fromBogotaLocal,
  shiftDays,
} from '@/lib/format/dates';
import { hoursBetween } from '@/lib/format/hours';

const DAY_MS = 24 * 60 * 60 * 1000;

// El día de secado de un momento: el día 1 es la fecha del inicio (en la hora de Bogotá), aunque
// haya empezado a media tarde. Se cuenta por fecha, así que un día sin bitácora sigue contando.
export const dayNumberOf = (startedAt: string, moment: string | Date) =>
  daysBetween(
    dateInBogota(startedAt),
    dateInBogota(new Date(moment).toISOString()),
  ) + 1;

// La fecha de una medición, en la hora de Bogotá.
export const logDateOf = (measuredAt: string) => dateInBogota(measuredAt);

// Las horas de esa fecha que caen dentro del secado: el día del inicio, desde la hora de inicio;
// hoy, hasta ahora; los demás días, completos. Las horas al sol y a la sombra de un día no pueden
// pasar de ahí. Igual que el servidor.
export function availableHours(
  logDate: string,
  startedAt: string,
  now: Date,
): number {
  const dayStart = new Date(fromBogotaLocal(`${logDate}T00:00`)).getTime();
  const start = Math.max(dayStart, new Date(startedAt).getTime());
  const end = Math.min(dayStart + DAY_MS, now.getTime());
  if (end <= start) return 0;
  return hoursBetween(
    new Date(start).toISOString(),
    new Date(end).toISOString(),
  );
}

// Cuántos días tiene el secado para mostrarlo: los que van hasta hoy, o hasta el último con
// bitácora si ya pasó (por ejemplo, una medición en la cola con fecha de ayer), o los de su
// resultado si ya terminó.
export function totalDays({
  startedAt,
  now,
  logDays,
  resultDays,
}: {
  startedAt: string;
  now: Date;
  logDays: readonly number[];
  resultDays?: number;
}) {
  if (resultDays !== undefined) return resultDays;
  return Math.max(dayNumberOf(startedAt, now), ...logDays);
}

export type DryDay<T> = { day: number; date: string; log: T | null };

// Los días del secado, del 1 al último, cada uno con su bitácora o sin ella: la «línea de tiempo»
// del lote, con los días que faltan a la vista.
export function dryingDays<T extends { day_number: number }>(
  startedAt: string,
  total: number,
  logs: readonly T[],
): DryDay<T>[] {
  const firstDate = dateInBogota(startedAt);
  return Array.from({ length: total }, (_, index) => ({
    day: index + 1,
    date: shiftDays(firstDate, index),
    log: logs.find(({ day_number }) => day_number === index + 1) ?? null,
  }));
}

// Falta la bitácora de hoy cuando ninguna de las fechas conocidas (las del servidor y las de la
// cola) es la de hoy.
export const missingTodayLog = (logDates: readonly string[], now: Date) =>
  !logDates.includes(dateInBogota(now.toISOString()));
