import type { SearchSelectOption } from '@/components/search-select';

// La opción de un filtro puesto aunque no esté entre las ofrecidas (vino en el enlace, la búsqueda
// cambió o el registro ya no está activo): se muestra igual, con el texto de `missing`.
export function chosenOption(
  id: string | null | undefined,
  options: readonly SearchSelectOption[],
  missing: string,
): SearchSelectOption | null {
  if (!id) return null;
  return options.find((option) => option.id === id) ?? { id, label: missing };
}
