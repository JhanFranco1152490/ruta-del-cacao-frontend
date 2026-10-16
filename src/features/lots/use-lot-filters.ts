'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import { isIsoDate } from '@/lib/format/dates';
import { LOT_STATUS_ORDER, type LotStatus } from '@/lib/lot-status';

import type { LotQuery } from './api';

// Los filtros viven en la URL, con los nombres en español como las rutas. Un valor malformado
// (?estado=zzz, ?desde=ayer) cuenta como "sin filtro".
const parsers = {
  search: parseAsString.withDefault(''),
  status: parseAsStringLiteral(LOT_STATUS_ORDER),
  farm: parseAsString,
  plot: parseAsString,
  variety: parseAsString,
  from: parseAsString,
  to: parseAsString,
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
};

const urlKeys = {
  search: 'buscar',
  status: 'estado',
  farm: 'finca',
  plot: 'parcela',
  variety: 'variedad',
  from: 'desde',
  to: 'hasta',
  producer: 'productor',
  page: 'pagina',
};

const dateOrUndefined = (value: string | null) =>
  value && isIsoDate(value) ? value : undefined;

export function useLotFilters() {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const search = usePaginatedSearch(params.search, setParams);
  const page = Math.max(1, params.page);
  const query: LotQuery = {
    search: params.search.trim() || undefined,
    status: params.status ?? undefined,
    farm: params.farm || undefined,
    plot: params.plot || undefined,
    variety: params.variety || undefined,
    from: dateOrUndefined(params.from),
    to: dateOrUndefined(params.to),
    producer: params.producer || undefined,
    page,
  };
  // El buscador y el estado se ven siempre; esto cuenta los demás, para el botón de celular.
  const activeCount = [
    query.farm,
    query.plot,
    query.variety,
    query.from,
    query.to,
  ].filter(Boolean).length;

  return {
    query,
    page,
    activeCount,
    hasFilters: activeCount > 0 || !!query.search || !!query.status,
    ...search,
    setStatus: (status: LotStatus | null) => setParams({ status, page: 1 }),
    // La parcela elegida puede ser de otra finca: al cambiar la finca se vuelve a elegir.
    setFarm: (farm: string | null) => setParams({ farm, plot: null, page: 1 }),
    setPlot: (plot: string | null) => setParams({ plot, page: 1 }),
    setVariety: (variety: string | null) => setParams({ variety, page: 1 }),
    setFrom: (from: string | null) => setParams({ from, page: 1 }),
    setTo: (to: string | null) => setParams({ to, page: 1 }),
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null, plot: null, page: 1 }),
    setPage: (next: number) => setParams({ page: next }),
    clear: () =>
      setParams({
        search: null,
        status: null,
        farm: null,
        plot: null,
        variety: null,
        from: null,
        to: null,
        page: 1,
      }),
  };
}
