export type InitialFarm =
  { kind: 'farm'; farmId: string } | { kind: 'no-farms' };

// Con qué finca se abre la lista. `farms` son las activas que la cuenta alcanza: una finca que ya
// no está entre ellas (en la URL o recordada) se trata como si no estuviera. La lista es de una
// finca a la vez y no se pregunta antes: manda la de la URL, después la última que se vio en este
// dispositivo y, si no hay ninguna, la primera. Cambiar de finca se hace desde la misma pantalla.
export function initialFarm({
  farms,
  urlFarm,
  remembered,
}: {
  farms: readonly string[];
  urlFarm: string | null;
  remembered: string | null;
}): InitialFarm {
  if (farms.length === 0) return { kind: 'no-farms' };
  const known = [urlFarm, remembered].find(
    (farm) => farm !== null && farms.includes(farm),
  );
  return { kind: 'farm', farmId: known ?? farms[0] };
}
