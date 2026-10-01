'use client';

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';

import type { FarmQuery } from './api';

const parsers = {
  search: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
};
const urlKeys = { search: 'buscar', page: 'pagina' };

export function useFarmFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const page = Math.max(1, params.page);
  const query: FarmQuery = {
    search: params.search.trim() || undefined,
    page,
  };
  return {
    query,
    page,
    ...search,
    setPage: (next: number) => setParams({ page: next }),
  };
}
