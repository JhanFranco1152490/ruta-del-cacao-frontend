'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';

import type { PlotQuery } from './api';

// Los filtros de las pantallas generales de parcelas y de caracterización viven en la URL, como
// los de fincas: se pueden compartir y el botón atrás los respeta.
const parsers = {
  search: parseAsString.withDefault(''),
  farm: parseAsString,
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
};
const urlKeys = {
  search: 'buscar',
  farm: 'finca',
  producer: 'productor',
  page: 'pagina',
};

export function usePlotFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const page = Math.max(1, params.page);
  // Un parámetro vacío es "sin filtro", no un id vacío que llegue a la consulta.
  const farm = params.farm || null;
  const producer = params.producer || null;
  const query: PlotQuery = {
    search: params.search.trim() || undefined,
    farm: farm ?? undefined,
    producer: producer ?? undefined,
    page,
  };
  return {
    query,
    page,
    farm,
    producer,
    ...search,
    setFarm: (id: string | null) => setParams({ farm: id, page: 1 }),
    // Las fincas del filtro son de un productor: al cambiarlo, la finca elegida deja de servir.
    setProducer: (id: string | null) =>
      setParams({ producer: id, farm: null, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
  };
}
