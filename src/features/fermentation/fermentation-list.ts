import {
  dateInBogota,
  formatShortDateTime,
  formatTime,
} from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import type { Fermentation, ReadyLot } from './api';
import { hoursBetween } from './fermentation-time';
import { isTurnOverdue, nextTurnDueAt } from './next-turn';
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

// El próximo volteo se calcula aquí y no se toma de la copia: la copia puede ser de ayer, y los
// volteos que esperan en la cola del teléfono también cuentan.
const dueAt = (fermentation: Fermentation) =>
  nextTurnDueAt(fermentation.started_at, lastTurnedAt(fermentation.turns));

export const countOverdue = (
  fermentations: readonly Fermentation[],
  now: Date,
) => fermentations.filter((item) => isTurnOverdue(dueAt(item), now)).length;

const turnsText = (count: number) =>
  count === 1 ? '1 volteo' : `${count} volteos`;

function nextTurnText(due: string, now: Date) {
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
export function cardFacts(fermentation: Fermentation, now: Date) {
  const hours = Math.floor(
    hoursBetween(fermentation.started_at, now.toISOString()),
  );
  const numbered = numberTurns(fermentation.turns);
  const last = numbered.at(-1);
  return {
    elapsed:
      numbered.length === 0
        ? `${hours} h de fermentación`
        : `${hours} h de fermentación · ${turnsText(numbered.length)}`,
    lastTurn: last
      ? [
          `Volteo ${last.number}`,
          `${formatDecimal(last.turn.temperature_c, 1)} °C`,
          `pH ${formatDecimal(last.turn.ph, 2)}`,
          formatShortDateTime(last.turn.turned_at),
        ].join(' · ')
      : null,
    next: nextTurnText(dueAt(fermentation), now),
  };
}
