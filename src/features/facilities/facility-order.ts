import { FACILITY_TYPE_ORDER } from '@/lib/facility-labels';

import type { PostharvestFacility } from './api';

const typeRank = (facility: PostharvestFacility) =>
  FACILITY_TYPE_ORDER.indexOf(facility.facility_type);

// Cajones primero y después marquesinas; dentro de cada tipo, por nombre con los números en orden
// natural (C-2 antes que C-10), que la API no hace. El `id` desempata para que el orden no salte
// entre una carga y otra.
export function sortFacilities(
  facilities: readonly PostharvestFacility[],
): PostharvestFacility[] {
  return [...facilities].sort(
    (a, b) =>
      typeRank(a) - typeRank(b) ||
      a.name.localeCompare(b.name, 'es', {
        numeric: true,
        sensitivity: 'base',
      }) ||
      a.id.localeCompare(b.id),
  );
}
