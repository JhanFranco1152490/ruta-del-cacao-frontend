'use client';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import { LIST_VIEWS, type ListView } from '@/lib/list-view';
import type { Role, RoleQuery } from './api';
import { isRoleId } from './schemas';

const kinds = ['fixed', 'predefined', 'custom'] as const;
const parsers = {
  search: parseAsString.withDefault(''),
  kind: parseAsStringLiteral(kinds),
  producer: parseAsString,
  view: parseAsStringLiteral(LIST_VIEWS).withDefault('agrupada'),
  page: parseAsInteger.withDefault(1),
};
const urlKeys = {
  search: 'buscar',
  kind: 'tipo',
  producer: 'productor',
  view: 'vista',
  page: 'pagina',
};

export function useRoleFilters(superuser: boolean) {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const producer =
    superuser && params.producer && isRoleId(params.producer)
      ? params.producer
      : undefined;
  const page = Math.max(1, params.page);
  // Solo la cuenta técnica ve roles propios de varios productores. Los demás ven los del sistema y
  // los suyos, siempre en dos secciones.
  const view: ListView = superuser ? params.view : 'agrupada';
  const query: RoleQuery = {
    search: params.search.trim() || undefined,
    kind: params.kind ?? undefined,
    producer,
    // Agrupados por productor, el servidor los ordena para que un grupo no se parta entre páginas.
    ordering: superuser && view === 'agrupada' ? 'producer,name' : undefined,
    page,
  };
  return {
    query,
    page,
    producer,
    kind: params.kind,
    view,
    ...search,
    setKind: (kind: Role['kind'] | null) => setParams({ kind, page: 1 }),
    setView: (view: ListView) => setParams({ view, page: 1 }),
    setProducer: (producer: string | null) => setParams({ producer, page: 1 }),
    clearProducer: () => setParams({ producer: null, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
