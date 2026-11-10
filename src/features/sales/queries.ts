import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { queryKeys, type SaleFilters } from '@/lib/api/query-keys';
import { type CachedRead, readThroughCache } from '@/lib/offline/cached-read';

import type {
  BuyerOption,
  FarmStockPage,
  FarmStockRow,
  Sale,
  SalePage,
  SaleSummary,
} from './api';

export type SaleSummaryFilters = Omit<SaleFilters, 'status' | 'page'>;

const summaryQuery = (filters: SaleSummaryFilters) => ({
  from: filters.from,
  to: filters.to,
  producer: filters.producer,
  farm: filters.farm,
  buyer: filters.buyer,
  search: filters.search.trim(),
});

const listQuery = (filters: Omit<SaleFilters, 'page'>) => ({
  ...summaryQuery(filters),
  status: filters.status,
});

// La copia es de la primera página de cada consulta: lo que se abre sin buscar más. Las siguientes
// páginas, solo con conexión. La cuenta técnica guarda la de cada productor aparte (va en la
// consulta).
export const salesCacheKey = (filters: Omit<SaleFilters, 'page'>) =>
  `sales:list:${apiPath('', listQuery(filters))}`;

export const saleSummaryCacheKey = (filters: SaleSummaryFilters) =>
  `sales:summary:${apiPath('', summaryQuery(filters))}`;

export const saleDetailCacheKey = (id: string) => `sales:detail:${id}`;

// Las ventas del periodo, de la más reciente a la más antigua. Al cambiar de página o de filtro se
// sigue mostrando lo anterior hasta que llega lo nuevo.
export const useSales = (userId: string | undefined, filters: SaleFilters) =>
  useQuery({
    queryKey: queryKeys.sales.list(filters),
    queryFn: ({ signal }): Promise<CachedRead<SalePage>> => {
      const fetchPage = () =>
        apiFetch<SalePage>(
          apiPath('/api/sales', {
            ...listQuery(filters),
            page: filters.page > 1 ? filters.page : undefined,
          }),
          { signal },
        );
      return filters.page > 1
        ? fetchPage().then((data) => ({ data }))
        : readThroughCache(userId!, salesCacheKey(filters), fetchPage);
    },
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Las cifras de la franja, con los filtros de la lista menos el estado: solo cuentan las
// registradas.
export const useSalesSummary = (
  userId: string | undefined,
  filters: SaleSummaryFilters,
) =>
  useQuery({
    queryKey: queryKeys.sales.summary(filters),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, saleSummaryCacheKey(filters), () =>
        apiFetch<SaleSummary>(
          apiPath('/api/sales/summary', summaryQuery(filters)),
          { signal },
        ),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Una venta con sus líneas. Con copia: una ficha que ya se abrió se consulta sin conexión.
export const useSale = (userId: string | undefined, id: string) =>
  useQuery({
    queryKey: queryKeys.sales.detail(id),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, saleDetailCacheKey(id), () =>
        apiFetch<Sale>(`/api/sales/${encodeURIComponent(id)}`, { signal }),
      ),
    enabled: !!userId && !!id,
    networkMode: 'offlineFirst',
  });

// Los compradores activos del productor, para el formulario. Solo con conexión: sin ella no se
// registra. La cuenta técnica nombra el productor.
export const useBuyerOptions = (producer: string | null, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.sales.buyerOptions(producer),
    queryFn: ({ signal }) =>
      apiFetch<{ results: BuyerOption[] }>(
        apiPath('/api/sales/buyer-options', { producer }),
        { signal },
      ).then(({ results }) => results),
    enabled,
  });

// Lo más que da el servidor por página. Una finca rara vez pasa de ahí, pero no se corta en
// silencio: se siguen las páginas hasta la última.
const STOCK_PAGE_SIZE = 100;

async function allFarmStock(farmId: string, signal: AbortSignal) {
  const rows: FarmStockRow[] = [];
  for (let page = 1; ; page += 1) {
    const { results, next } = await apiFetch<FarmStockPage>(
      apiPath('/api/stock', {
        farm: farmId,
        page_size: STOCK_PAGE_SIZE,
        page: page > 1 ? page : undefined,
      }),
      { signal },
    );
    rows.push(...results);
    if (!next) return rows;
  }
}

// Todo lo que hay en bodega en la finca de la venta: de ahí sale cada línea. Solo con conexión.
export const useFarmStock = (farmId: string) =>
  useQuery({
    queryKey: queryKeys.sales.farmStock(farmId),
    queryFn: ({ signal }) => allFarmStock(farmId, signal),
    enabled: !!farmId,
  });
