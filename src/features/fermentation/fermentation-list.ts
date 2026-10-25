import {
  dateInBogota,
  formatShortDateTime,
  formatTime,
} from '@/lib/format/dates';

import type { Fermentation, ReadyLot } from './api';
import { hoursBetween, turnsText } from './fermentation-time';
import { phText, temperatureText } from './measure-text';
import { isTurnOverdue, nextTurnDueAt } from './next-turn';
import { pendingTurnsOf, type QueuedTurn } from './turn-queue';
import { lastTurnedAt, numberTurns } from './turn-rules';

export const fermentationsOfFarm = (
  fermentations: readonly Fermentation[],
  farm: string | null,
) =>
  farm ? fermentations.filter((item) => item.farm.id === farm) : fermentations;

export const readyLotsOfFarm = (
  lots: readonly ReadyLot[],
  farm: string | null,
) => (farm ? lots.filter((lot) => lot.harvest.plot.farm.id === farm) : lots);

// Un volteo como se muestra: los del servidor y los que esperan en la cola del teléfono, juntos.
type ShownTurn = {
  id: string;
  turned_at: string;
  temperature_c: string;
  ph: string;
  pending: boolean;
};

export const shownTurns = (
  fermentation: Fermentation,
  queued: readonly QueuedTurn[],
): ShownTurn[] => [
  ...fermentation.turns.map((turn) => ({ ...turn, pending: false })),
  ...pendingTurnsOf(queued, fermentation.lot.id).map(({ request }) => ({
    ...request,
    pending: true,
  })),
];

// El próximo volteo se calcula aquí y no se toma de la copia: la copia puede ser de ayer, y los
// volteos que esperan en la cola del teléfono también cuentan.
export const dueAt = (
  fermentation: Fermentation,
  turns: readonly ShownTurn[],
) => nextTurnDueAt(fermentation.started_at, lastTurnedAt(turns));

export const countOverdue = (
  fermentations: readonly Fermentation[],
  now: Date,
  queued: readonly QueuedTurn[] = [],
) =>
  fermentations.filter((item) =>
    isTurnOverdue(dueAt(item, shownTurns(item, queued)), now),
  ).length;

export function nextTurnText(due: string, now: Date) {
  if (!isTurnOverdue(due, now)) {
    return {
      overdue: false,
      text: `Próximo volteo: ${formatShortDateTime(due)}`,
    };
  }
  // Si quedó pendiente desde otro día, la hora sola confundiría.
  const today = dateInBogota(now.toISOString()) === dateInBogota(due);
  return {
    overdue: true,
    text: today
      ? `Volteo pendiente desde las ${formatTime(due)}`
      : `Volteo pendiente desde el ${formatShortDateTime(due)}`,
  };
}

// Lo que dice la tarjeta de un lote en fermentación: «52 h de fermentación · 2 volteos», el
// último volteo y el próximo. Las horas se cuentan con el reloj del dispositivo, en horas enteras.
// Los volteos que esperan en la cola cuentan con el número que tendrían.
export function cardFacts(
  fermentation: Fermentation,
  now: Date,
  queued: readonly QueuedTurn[] = [],
) {
  const hours = Math.floor(
    hoursBetween(fermentation.started_at, now.toISOString()),
  );
  const turns = shownTurns(fermentation, queued);
  const numbered = numberTurns(turns);
  const last = numbered.at(-1);
  return {
    elapsed:
      numbered.length === 0
        ? `${hours} h de fermentación`
        : `${hours} h de fermentación · ${turnsText(numbered.length)}`,
    lastTurn: last
      ? [
          `Volteo ${last.number}`,
          temperatureText(last.turn.temperature_c),
          `pH ${phText(last.turn.ph)}`,
          formatShortDateTime(last.turn.turned_at),
          ...(last.turn.pending ? ['Pendiente de enviar'] : []),
        ].join(' · ')
      : null,
    next: nextTurnText(dueAt(fermentation, turns), now),
  };
}
