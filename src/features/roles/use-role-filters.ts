'use client';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import type { Role, RoleQuery } from './api';
import { isRoleId } from './schemas';

const kinds = ['fixed', 'predefined', 'custom'] as const;
const parsers = {
  search: parseAsString.withDefault(''),
  kind: parseAsStringLiteral(kinds),
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
};
const urlKeys = {
  search: 'buscar',
  kind: 'tipo',
  producer: 'productor',
  page: 'pagina',
};

export function useRoleFilters(association: boolean) {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const producer =
    association && params.producer && isRoleId(params.producer)
      ? params.producer
      : undefined;
  const page = Math.max(1, params.page);
  const query: RoleQuery = {
    search: params.search.trim() || undefined,
    kind: params.kind ?? undefined,
    producer,
    // La asociación ve roles propios de varios productores y se agrupan por productor: el servidor
    // los ordena para que un grupo no se parta entre páginas.
    ordering: association ? 'producer,name' : undefined,
    page,
  };
  return {
    query,
    page,
    producer,
    kind: params.kind,
    ...search,
    setKind: (kind: Role['kind'] | null) => setParams({ kind, page: 1 }),
    setProducer: (producer: string | null) => setParams({ producer, page: 1 }),
    clearProducer: () => setParams({ producer: null, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
