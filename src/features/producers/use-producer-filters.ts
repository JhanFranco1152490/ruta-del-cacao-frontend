'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { usePaginatedSearch } from '@/hooks/use-paginated-search';

import type { ProducerQuery, ProducerStatus } from './api';

const STATUSES = [
  'active',
  'inactive',
] as const satisfies readonly ProducerStatus[];

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. Los valores
// malformados (?pagina=abc, ?estado=zzz) caen al valor por defecto en vez de romper la lista.
const parsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(STATUSES),
  municipality: parseAsString,
  page: parseAsInteger.withDefault(1),
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  search: 'buscar',
  status: 'estado',
  municipality: 'municipio',
  page: 'pagina',
};

export function useProducerFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);

  const page = Math.max(1, params.page);
  // `?municipio=` vacío es "sin filtro", no un código vacío que llegue a la clave de la consulta.
  const municipality = params.municipality || null;
  const query: ProducerQuery = {
    search: params.search.trim() || undefined,
    status: params.status ?? undefined,
    municipality: municipality ?? undefined,
    page,
  };

  return {
    query,
    ...search,
    status: params.status,
    municipality,
    page,
    setStatus: (status: ProducerStatus | null) =>
      setParams({ status, page: 1 }),
    setMunicipality: (code: string | null) =>
      setParams({ municipality: code, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
  };
}
