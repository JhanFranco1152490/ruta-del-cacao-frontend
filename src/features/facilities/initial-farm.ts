export type InitialFarm =
  { kind: 'farm'; farmId: string } | { kind: 'choose' } | { kind: 'no-farms' };

// Con qué finca se abre la lista. `farms` son las activas que la cuenta alcanza: una finca que ya
// no está entre ellas (en la URL o recordada) se trata como si no estuviera y se pregunta de nuevo.
// Quien tiene una sola nunca elige, ni siquiera si lo pide la URL.
export function initialFarm({
  farms,
  urlFarm,
  choose,
  remembered,
}: {
  farms: readonly string[];
  urlFarm: string | null;
  choose: boolean;
  remembered: string | null;
}): InitialFarm {
  if (farms.length === 0) return { kind: 'no-farms' };
  if (farms.length === 1) return { kind: 'farm', farmId: farms[0] };
  if (urlFarm) {
    return farms.includes(urlFarm)
      ? { kind: 'farm', farmId: urlFarm }
      : { kind: 'choose' };
  }
  if (!choose && remembered && farms.includes(remembered)) {
    return { kind: 'farm', farmId: remembered };
  }
  return { kind: 'choose' };
}
