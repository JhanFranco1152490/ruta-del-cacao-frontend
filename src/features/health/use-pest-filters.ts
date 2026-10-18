'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import { PEST_STATUS_FILTERS } from './pest-filters';

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. Un estado que no
// existe cae en "todas".
const parsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(PEST_STATUS_FILTERS),
};
// En la URL los parámetros van en español, como las rutas.
const urlKeys = { search: 'buscar', status: 'estado' };

export function usePestFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  return {
    search: params.search,
    status: params.status,
    // Una búsqueda vacía sale de la URL en vez de quedar como `?buscar=`.
    setSearch: (search: string) => setParams({ search: search || null }),
    setStatus: (status: string) =>
      setParams({
        status: (PEST_STATUS_FILTERS as readonly string[]).includes(status)
          ? (status as (typeof PEST_STATUS_FILTERS)[number])
          : null,
      }),
  };
}
