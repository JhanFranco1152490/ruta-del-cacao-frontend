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

const parsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(['active', 'inactive'] as const),
  activation: parseAsStringLiteral(['pendiente', 'activada'] as const),
  role: parseAsString,
  producer: parseAsString,
  municipality: parseAsString,
  page: parseAsInteger.withDefault(1),
};
export type AccountScope = {
  // Solo las cuentas de este productor (la vista "Del productor activo").
  producer?: string | null;
  // Agrupadas por productor: el servidor las ordena para que un grupo no se parta entre páginas.
  grouped?: boolean;
};

export function useAccountFilters(
  association: boolean,
  scope: AccountScope = {},
) {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys: {
      search: 'buscar',
      status: 'estado',
      activation: 'activacion',
      role: 'rol',
      producer: 'productor',
      municipality: 'municipio',
      page: 'pagina',
    },
  });
  const search = usePaginatedSearch(params.search, setParams);
  const producer =
    scope.producer ??
    (association && params.producer && isUuid(params.producer)
      ? params.producer
      : undefined);
  // El municipio es del productor de la cuenta: solo filtra algo para la asociación, que ve
  // cuentas de varios productores.
  const municipality =
    association && params.municipality ? params.municipality : undefined;
  const role = params.role && isUuid(params.role) ? params.role : undefined;
  const page = Math.max(1, params.page);
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
    ordering: scope.grouped ? 'producer,last_name' : undefined,
    page,
  };
  return {
    query,
    ...search,
    page,
    producer,
    municipality,
    role,
    status: params.status,
    activation: params.activation,
    setStatus: (status: AccountQuery['status']) =>
      setParams({ status: status ?? null, page: 1 }),
    setActivation: (activation: 'pendiente' | 'activada' | null) =>
      setParams({ activation, page: 1 }),
    setRole: (role: string | null) => setParams({ role, page: 1 }),
    setMunicipality: (municipality: string | null) =>
      setParams({ municipality, page: 1 }),
    setProducer: (producer: string | null) => setParams({ producer, page: 1 }),
    clearProducer: () => setParams({ producer: null, page: 1 }),
    setPage: (page: number) => setParams({ page }),
  };
}
