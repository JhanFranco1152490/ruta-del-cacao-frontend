import { durationText } from '@/lib/format/hours';

import type { Fermentation } from './api';

// La línea de la etapa en la lista: el cajón, si sigue en curso o cuánto duró, y los volteos.
export function fermentationSummary(fermentation: Fermentation) {
  const turns = fermentation.turns.length;
  return [
    fermentation.facility.name,
    fermentation.result
      ? durationText(fermentation.result.duration_hours)
      : 'En curso',
    turns === 1 ? '1 volteo' : `${turns} volteos`,
  ].join(' · ');
}
