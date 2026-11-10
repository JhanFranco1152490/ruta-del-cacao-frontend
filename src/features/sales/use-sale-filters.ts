'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { parseAsMonth } from '@/hooks/use-month-param';
import { usePaginatedSearch } from '@/hooks/use-paginated-search';
import type { SaleFilters } from '@/lib/api/query-keys';
import { monthBounds, shiftMonth, todayInBogota } from '@/lib/format/dates';

import type { SaleSummaryFilters } from './queries';

// En la URL el estado lleva los valores del API, como en Compradores; «Registradas» es lo que se
// abre, así que no se escribe.
export const SALE_STATUS_FILTERS = ['registered', 'voided', 'all'] as const;
export type SaleStatusFilter = (typeof SALE_STATUS_FILTERS)[number];

// Un estado malformado (?estado=zzz) cuenta como el de siempre; un vacío (?comprador=), como
// ningún filtro.
const parsers = {
  month: parseAsMonth,
  farm: parseAsString,
  buyer: parseAsString,
  status: parseAsStringLiteral(SALE_STATUS_FILTERS).withDefault('registered'),
  search: parseAsString.withDefault(''),
  producer: parseAsString,
  page: parseAsInteger.withDefault(1),
};

const urlKeys = {
  month: 'mes',
  farm: 'finca',
  buyer: 'comprador',
  status: 'estado',
  search: 'buscar',
  producer: 'productor',
  page: 'pagina',
};

// El mes (`?mes=`) y los filtros de Ventas viven en la URL: se comparten y el botón atrás los
// respetan. Van en un solo estado para que cambiar de mes y volver a la primera página sea una sola
// escritura. Sin mes es el actual, que no se escribe.
export function useSaleFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });
  const search = usePaginatedSearch(params.search, setParams);
  const today = todayInBogota();
  const currentMonth = today.slice(0, 7);
  const month = params.month ?? currentMonth;
  const { from, to } = monthBounds(month);
  const goToMonth = (target: string) =>
    setParams({ month: target === currentMonth ? null : target, page: null });

  const summaryFilters: SaleSummaryFilters = {
    producer: params.producer || null,
    from,
    to,
    farm: params.farm || null,
    buyer: params.buyer || null,
    search: params.search.trim(),
  };
  const filters: SaleFilters = {
    ...summaryFilters,
    status: params.status === 'all' ? null : params.status,
    page: Math.max(1, params.page),
  };

  return {
    period: {
      month,
      today,
      isCurrentMonth: month === currentMonth,
      goPrevious: () => goToMonth(shiftMonth(month, -1)),
      goNext: () => goToMonth(shiftMonth(month, 1)),
      goToday: () => goToMonth(currentMonth),
      goToMonth,
    },
    filters,
    summaryFilters,
    status: params.status,
    hasFilters:
      !!summaryFilters.farm ||
      !!summaryFilters.buyer ||
      !!summaryFilters.search ||
      params.status !== 'registered',
    ...search,
    setFarm: (farm: string | null) => setParams({ farm, page: null }),
    setBuyer: (buyer: string | null) => setParams({ buyer, page: null }),
    setStatus: (status: SaleStatusFilter) => setParams({ status, page: null }),
    setPage: (page: number) => setParams({ page }),
    // La finca y el comprador elegidos eran del productor anterior.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null, buyer: null, page: null }),
    // Limpiar deja el mes y el productor: son lo que se está mirando, no un filtro.
    clear: () =>
      setParams({
        farm: null,
        buyer: null,
        status: null,
        search: null,
        page: null,
      }),
  };
}
