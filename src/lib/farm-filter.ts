export type FarmOption = { id: string; label: string; name: string };

// La finca del filtro: su nombre para los vacíos y la opción del selector, aunque todavía no esté
// entre las opciones cargadas.
export function resolveFarmFilter(
  options: readonly FarmOption[],
  farmId: string | null,
): {
  name: string | null;
  choice: FarmOption | { id: string; label: string } | null;
} {
  if (!farmId) return { name: null, choice: null };
  const chosen = options.find(({ id }) => id === farmId);
  const name = chosen?.name ?? 'esta finca';
  return { name, choice: chosen ?? { id: farmId, label: name } };
}

// Lo de la finca elegida: los procesos de poscosecha (con su finca) o los lotes (con su cosecha). Sin
// finca elegida, todo.
export const processesOfFarm = <T extends { farm: { id: string } }>(
  processes: readonly T[],
  farm: string | null,
) => (farm ? processes.filter((item) => item.farm.id === farm) : processes);

export const lotsOfFarm = <
  T extends { harvest: { plot: { farm: { id: string } } } },
>(
  lots: readonly T[],
  farm: string | null,
) => (farm ? lots.filter((lot) => lot.harvest.plot.farm.id === farm) : lots);
