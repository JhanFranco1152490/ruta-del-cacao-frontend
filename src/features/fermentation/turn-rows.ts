import type { Fermentation, FermentationTurn } from './api';
import { hoursBetween } from '@/lib/format/hours';
import { pendingTurnsOf, type QueuedTurn } from './turn-queue';
import { numberTurns } from './turn-rules';

// Una fila de la tabla de volteos de la ficha. `turn` es el del servidor: solo esos se corrigen o se
// eliminan; los que esperan en la cola del teléfono se ven con el número que tendrán.
export type TurnRow = {
  id: string;
  number: number;
  turnedAt: string;
  hours: number;
  temperature: string;
  ph: string;
  notes: string;
  recordedBy: string | null;
  pending: boolean;
  turn?: FermentationTurn;
};

export function turnRows(
  fermentation: Fermentation,
  queued: readonly QueuedTurn[],
): TurnRow[] {
  const all = [
    ...fermentation.turns.map((turn) => ({
      id: turn.id,
      turned_at: turn.turned_at,
      row: {
        turnedAt: turn.turned_at,
        hours: Number(turn.hours_since_start),
        temperature: turn.temperature_c,
        ph: turn.ph,
        notes: turn.notes,
        recordedBy: turn.recorded_by.full_name,
        pending: false,
        turn,
      },
    })),
    ...pendingTurnsOf(queued, fermentation.lot.id).map(({ request }) => ({
      id: request.id,
      turned_at: request.turned_at,
      row: {
        turnedAt: request.turned_at,
        hours: hoursBetween(fermentation.started_at, request.turned_at),
        temperature: request.temperature_c,
        ph: request.ph,
        notes: request.notes ?? '',
        recordedBy: null,
        pending: true,
      },
    })),
  ];
  return numberTurns(all).map(({ turn, number }) => ({
    id: turn.id,
    number,
    ...turn.row,
  }));
}

// Con algún volteo, el inicio ya no se corrige y la fermentación se puede finalizar. Los que van
// camino al servidor también cuentan.
export const hasAnyTurn = (
  fermentation: Fermentation,
  queued: readonly QueuedTurn[],
) =>
  fermentation.turns.length > 0 ||
  pendingTurnsOf(queued, fermentation.lot.id).length > 0;
