import { OTHER_PEST_FILTER } from './history-filters';

// Lo que ofrece el filtro de plaga: las del catálogo activo por nombre y Otra al final. `chosen` es
// la plaga del filtro puesto: se ofrece aunque ya no esté en el catálogo activo (se desactivó, o
// el catálogo no ha llegado), para que el filtro no se vea como "Todas".
export function pestFilterOptions(
  catalog: readonly { id: string; name: string }[] | undefined,
  chosen: string | null,
) {
  const options = [...(catalog ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map(({ id, name }) => ({ value: id, label: name }));
  options.push({ value: OTHER_PEST_FILTER, label: 'Otra' });
  if (chosen && !options.some(({ value }) => value === chosen)) {
    options.push({ value: chosen, label: 'Plaga elegida' });
  }
  return options;
}
