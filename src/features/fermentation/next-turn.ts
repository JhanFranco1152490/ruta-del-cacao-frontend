// El protocolo de campo voltea la masa a las 48 horas del inicio y después cada 24 horas. Son las
// mismas horas con las que el servidor avisa de un volteo pendiente: si cambian, cambian en los dos.
export const FIRST_TURN_AFTER_HOURS = 48;
export const NEXT_TURN_AFTER_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

// Cuándo toca el siguiente volteo. Es una guía, no una regla: un volteo se registra a la hora en
// que se hizo, antes o después.
export function nextTurnDueAt(startedAt: string, lastTurnedAt: string | null) {
  const from = lastTurnedAt ?? startedAt;
  const after = lastTurnedAt ? NEXT_TURN_AFTER_HOURS : FIRST_TURN_AFTER_HOURS;
  return new Date(new Date(from).getTime() + after * HOUR_MS).toISOString();
}

export const isTurnOverdue = (dueAt: string, now: Date = new Date()) =>
  now.getTime() > new Date(dueAt).getTime();
