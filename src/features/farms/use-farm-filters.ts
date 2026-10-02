'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';

import type { FarmQuery } from './api';

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. La lista y el
// mapa leen los mismos.
const parsers = {
  search: parseAsString.withDefault(''),
  municipality: parseAsString,
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
};
// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  search: 'buscar',
  municipality: 'municipio',
  producer: 'productor',
  page: 'pagina',
};

export function useFarmFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const page = Math.max(1, params.page);
  // `?municipio=` vacío es "sin filtro", no un código vacío que llegue a la clave de la consulta.
  const municipality = params.municipality || null;
  const producer = params.producer || null;
  const query: FarmQuery = {
    search: params.search.trim() || undefined,
    municipality: municipality ?? undefined,
    producer: producer ?? undefined,
    page,
  };
  return {
    query,
    page,
    municipality,
    producer,
    ...search,
    setMunicipality: (code: string | null) =>
      setParams({ municipality: code, page: 1 }),
    setProducer: (id: string | null) => setParams({ producer: id, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
  };
}
