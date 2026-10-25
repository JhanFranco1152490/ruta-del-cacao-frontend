import { dueAt, nextTurnText, shownTurns } from './fermentation-list';
import { hoursBetween } from './fermentation-time';
import { isTurnOverdue } from './next-turn';
import type { QueuedTurn } from './turn-queue';
import { numberTurns } from './turn-rules';
import type { Fermentation } from './api';

const HOUR_MS = 60 * 60 * 1000;

// Cuánto falta o cuánto lleva atrasado un volteo, con las palabras de campo: «en 5 h», «hace 3 h».
// Pasadas las 48 h se dice en días.
export function relativeHours(dueAt: string, now: Date) {
  const diff = (new Date(dueAt).getTime() - now.getTime()) / HOUR_MS;
  const hours = Math.round(Math.abs(diff));
  const amount = hours >= 48 ? `${Math.round(hours / 24)} días` : `${hours} h`;
  if (hours < 1) return diff >= 0 ? 'en menos de 1 h' : 'hace menos de 1 h';
  return diff >= 0 ? `en ${amount}` : `hace ${amount}`;
}

// Dónde cae un instante entre el inicio y el final de la barra, en porcentaje. Sin llegar a los
// bordes, para que un punto no quede cortado.
const MIN_PERCENT = 4;
const MAX_PERCENT = 96;

// Todo lo que dibujan las tarjetas de un lote en fermentación, ya resuelto: las horas con el reloj
// del dispositivo, los volteos del servidor y los de la cola juntos, el último, el próximo y dónde
// cae cada uno en la línea de tiempo (del inicio hasta lo que llegue más lejos: ahora o el próximo).
export function cardDetails(
  fermentation: Fermentation,
  now: Date,
  queued: readonly QueuedTurn[] = [],
) {
  const turns = shownTurns(fermentation, queued);
  const numbered = numberTurns(turns);
  const last = numbered.at(-1);
  const due = dueAt(fermentation, turns);
  const start = new Date(fermentation.started_at).getTime();
  const end = Math.max(now.getTime(), new Date(due).getTime());
  const span = Math.max(end - start, 1);
  const percent = (iso: string) =>
    Math.min(
      MAX_PERCENT,
      Math.max(MIN_PERCENT, ((new Date(iso).getTime() - start) / span) * 100),
    );

  return {
    startedAt: fermentation.started_at,
    hours: Math.floor(hoursBetween(fermentation.started_at, now.toISOString())),
    turnCount: numbered.length,
    last: last
      ? {
          number: last.number,
          temperature: last.turn.temperature_c,
          ph: last.turn.ph,
          at: last.turn.turned_at,
          pending: last.turn.pending,
        }
      : null,
    next: {
      ...nextTurnText(due, now),
      dueAt: due,
      relative: relativeHours(due, now),
      overdue: isTurnOverdue(due, now),
    },
    timeline: {
      points: numbered.map(({ turn, number }) => ({
        number,
        percent: percent(turn.turned_at),
        at: turn.turned_at,
        temperature: turn.temperature_c,
        ph: turn.ph,
        pending: turn.pending,
      })),
      nowPercent: percent(now.toISOString()),
      duePercent: percent(due),
    },
  };
}
