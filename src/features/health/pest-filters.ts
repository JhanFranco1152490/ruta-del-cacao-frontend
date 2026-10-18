import { normalizeCatalogName } from '@/lib/format/search';

import type { PestDisease, PestDiseaseKind } from './pest-api';

export const PEST_STATUS_FILTERS = ['activas', 'inactivas'] as const;
export type PestStatusFilter = (typeof PEST_STATUS_FILTERS)[number];

export const PEST_DISEASE_KIND_LABELS: Record<PestDiseaseKind, string> = {
  pest: 'Plaga',
  disease: 'Enfermedad',
};

// La búsqueda compara como el servidor, en el nombre y en el nombre científico: "moniliophthora"
// encuentra la Monilia y "mazorca-NEGRA" la Mazorca negra.
export function matchesPestFilters(
  item: PestDisease,
  search: string,
  status: PestStatusFilter | null,
) {
  if (status === 'activas' && !item.is_active) return false;
  if (status === 'inactivas' && item.is_active) return false;
  const needle = normalizeCatalogName(search);
  if (!needle) return true;
  return [item.name, item.scientific_name ?? ''].some((text) =>
    normalizeCatalogName(text).includes(needle),
  );
}
