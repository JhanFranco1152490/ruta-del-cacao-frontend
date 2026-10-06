'use client';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import { isUuid } from '@/lib/validation/is-uuid';
import type { AccountQuery } from '@/lib/api/accounts';
import { LIST_VIEWS, type ListView } from '@/lib/list-view';

const parsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(['active', 'inactive'] as const),
  activation: parseAsStringLiteral(['pendiente', 'activada'] as const),
  role: parseAsString,
  producer: parseAsString,
  municipality: parseAsString,
  view: parseAsStringLiteral(LIST_VIEWS).withDefault('lista'),
  page: parseAsInteger.withDefault(1),
};
export function useAccountFilters(association: boolean, superuser: boolean) {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys: {
      search: 'buscar',
      status: 'estado',
      activation: 'activacion',
      role: 'rol',
      producer: 'productor',
      municipality: 'municipio',
      view: 'vista',
      page: 'pagina',
    },
  });
  const search = usePaginatedSearch(params.search, setParams);
  const producer =
    association && params.producer && isUuid(params.producer)
      ? params.producer
      : undefined;
  // El municipio es del productor de la cuenta: solo filtra algo para la asociación, que ve
  // cuentas de varios productores.
  const municipality =
    association && params.municipality ? params.municipality : undefined;
  const role = params.role && isUuid(params.role) ? params.role : undefined;
  const page = Math.max(1, params.page);
  // Agrupar por productor es de la cuenta técnica: el Administrador de la asociación solo ve las
  // cuentas de administrador y de productor, una por productor, y no hay qué agrupar.
  const view: ListView = superuser ? params.view : 'lista';
  const query: AccountQuery = {
    search: params.search.trim() || undefined,
    status: params.status ?? undefined,
    activation_pending:
      params.activation === null
        ? undefined
        : params.activation === 'pendiente',
    role,
    producer,
    municipality,
    // Agrupadas, el servidor las ordena por productor para que un grupo no se parta entre páginas.
    ordering: view === 'agrupada' ? 'producer,last_name' : undefined,
    page,
  };
  return {
    query,
    ...search,
    page,
    producer,
    municipality,
    role,
    view,
    status: params.status,
    activation: params.activation,
    setStatus: (status: AccountQuery['status']) =>
      setParams({ status: status ?? null, page: 1 }),
    setActivation: (activation: 'pendiente' | 'activada' | null) =>
      setParams({ activation, page: 1 }),
    setRole: (role: string | null) => setParams({ role, page: 1 }),
    setMunicipality: (municipality: string | null) =>
      setParams({ municipality, page: 1 }),
    setView: (view: ListView) => setParams({ view, page: 1 }),
    setProducer: (producer: string | null) => setParams({ producer, page: 1 }),
    clearProducer: () => setParams({ producer: null, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
