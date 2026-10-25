// Cuándo toca cada volteo lo decide el productor (parámetros de poscosecha): en la línea base, a las
// 48 horas del inicio y después cada 24. El servidor entrega esas horas con cada fermentación, así
// que el teléfono calcula lo mismo que él, también sin conexión.
export type TurnSchedule = {
  first_turn_hours: number;
  next_turn_hours: number;
};

// Una copia guardada antes de que el servidor enviara los parámetros no los trae: mientras se
// renueva, se usan las horas de la línea base.
export const BASELINE_TURN_SCHEDULE: TurnSchedule = {
  first_turn_hours: 48,
  next_turn_hours: 24,
};

const HOUR_MS = 60 * 60 * 1000;

// Cuándo toca el siguiente volteo. Es una guía, no una regla: un volteo se registra a la hora en
// que se hizo, antes o después.
export function nextTurnDueAt(
  startedAt: string,
  lastTurnedAt: string | null,
  schedule: TurnSchedule = BASELINE_TURN_SCHEDULE,
) {
  const from = lastTurnedAt ?? startedAt;
  const after = lastTurnedAt
    ? schedule.next_turn_hours
    : schedule.first_turn_hours;
  return new Date(new Date(from).getTime() + after * HOUR_MS).toISOString();
}

export const isTurnOverdue = (dueAt: string, now: Date = new Date()) =>
  now.getTime() > new Date(dueAt).getTime();
