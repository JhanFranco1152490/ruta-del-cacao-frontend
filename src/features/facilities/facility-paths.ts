import type { FacilityFilters } from './facility-filters';

export const FACILITIES_PATH = '/infraestructura';

// «‹ Fincas»: vuelve a elegir la finca, también tras entrar directo por la recordada. Conserva los
// filtros y el productor, para comparar lo mismo en otra finca.
export function chooseFarmHref(
  filters: FacilityFilters,
  producer: string | null,
) {
  const params = new URLSearchParams();
  if (producer) params.set('productor', producer);
  if (filters.type !== 'all') params.set('tipo', filters.type);
  if (filters.status !== 'all') params.set('estado', filters.status);
  params.set('elegir', '1');
  return `${FACILITIES_PATH}?${params}`;
}
