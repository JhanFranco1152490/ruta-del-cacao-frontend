import { formatTime } from '@/lib/format/dates';

import { minuteOf } from '@/lib/format/hours';
import type { TimedTurn } from './turn-rules';

// El servidor guarda la hora de un volteo sin segundos y no acepta dos en el mismo minuto: así el
// mismo volteo registrado desde dos teléfonos no cuenta dos veces. Aquí se avisa antes de guardar
// con lo que el dispositivo conoce (la copia y la cola); la respuesta del servidor manda.
export function sameMinuteTurn<T extends TimedTurn>(
  turns: readonly T[],
  turnedAt: string,
  exceptId?: string,
) {
  const minute = minuteOf(turnedAt);
  return turns.find(
    ({ id, turned_at }) => id !== exceptId && minuteOf(turned_at) === minute,
  );
}

export const duplicateTurnMessage = (turnedAt: string) =>
  `Ya hay un volteo registrado a las ${formatTime(turnedAt)}.`;
