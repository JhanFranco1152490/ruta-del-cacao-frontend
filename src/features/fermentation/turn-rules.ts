// Lo mínimo de un volteo para ordenarlo: los del servidor y los que esperan en la cola del
// dispositivo se numeran juntos.
export type TimedTurn = { id: string; turned_at: string };

const instant = (isoDateTime: string) => new Date(isoDateTime).getTime();

// El número de un volteo es su posición por hora, no el orden en que llegó: uno hecho sin conexión
// que se envía tarde queda en su lugar, y los siguientes corren su número. El servidor numera igual.
export function numberTurns<T extends TimedTurn>(turns: readonly T[]) {
  return turns
    .toSorted((a, b) => instant(a.turned_at) - instant(b.turned_at))
    .map((turn, index) => ({ turn, number: index + 1 }));
}

// El número que tendría un volteo hecho a esa hora. Al corregir uno, se deja fuera a sí mismo.
export function turnNumberAt(
  turns: readonly TimedTurn[],
  turnedAt: string,
  exceptId?: string,
) {
  const at = instant(turnedAt);
  return (
    turns.filter(
      ({ id, turned_at }) => id !== exceptId && instant(turned_at) < at,
    ).length + 1
  );
}

export function lastTurnedAt(turns: readonly TimedTurn[]): string | null {
  return numberTurns(turns).at(-1)?.turn.turned_at ?? null;
}
