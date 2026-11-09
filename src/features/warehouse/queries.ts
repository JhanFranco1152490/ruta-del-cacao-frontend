import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import {
  type ExitFilters,
  type PendingEntryFilters,
  queryKeys,
  type StockFilters,
  type WarehouseFilters,
} from '@/lib/api/query-keys';
import { type CachedRead, readThroughCache } from '@/lib/offline/cached-read';

import type {
  ExitSummary,
  LotStock,
  StockExitPage,
  PendingEntryPage,
  StockPage,
  StockSummary,
  WarehousePage,
} from './api';

export type StockSummaryFilters = Omit<StockFilters, 'ordering' | 'page'>;

const stockQuery = (filters: StockSummaryFilters) => ({
  producer: filters.producer,
  farm: filters.farm,
  warehouse: filters.warehouse,
  grade: filters.grade,
  location: filters.location.trim(),
  search: filters.search.trim(),
});

export type ExitSummaryFilters = Omit<ExitFilters, 'state' | 'page'>;

const exitSummaryQuery = (filters: ExitSummaryFilters) => ({
  producer: filters.producer,
  farm: filters.farm,
  warehouse: filters.warehouse,
  grade: filters.grade,
  reason: filters.reason,
  date_from: filters.from,
  date_to: filters.to,
  search: filters.search.trim(),
});

const exitQuery = (filters: Omit<ExitFilters, 'page'>) => ({
  ...exitSummaryQuery(filters),
  state: filters.state,
});

const pendingQuery = (filters: Omit<PendingEntryFilters, 'page'>) => ({
  producer: filters.producer,
  farm: filters.farm,
  search: filters.search.trim(),
});

const warehouseQuery = (filters: Omit<WarehouseFilters, 'page'>) => ({
  producer: filters.producer,
  farm: filters.farm,
  active: filters.active,
});

const pageOf = (page: number) => (page > 1 ? page : undefined);

// La copia es de la primera página de cada pestaña con sus filtros (y su orden, en existencias):
// lo que se abre sin buscar más. Las siguientes páginas solo con conexión.
export const stockCacheKey = (filters: Omit<StockFilters, 'page'>) =>
  `warehouse:stock:${apiPath('', { ...stockQuery(filters), ordering: filters.ordering })}`;

export const stockSummaryCacheKey = (filters: StockSummaryFilters) =>
  `warehouse:summary:${apiPath('', stockQuery(filters))}`;

export const exitsCacheKey = (filters: Omit<ExitFilters, 'page'>) =>
  `warehouse:exits:${apiPath('', exitQuery(filters))}`;

export const exitSummaryCacheKey = (filters: ExitSummaryFilters) =>
  `warehouse:exit-summary:${apiPath('', exitSummaryQuery(filters))}`;

export const pendingEntryCacheKey = (
  filters: Omit<PendingEntryFilters, 'page'>,
) => `warehouse:pending:${apiPath('', pendingQuery(filters))}`;

export const warehousesCacheKey = (filters: Omit<WarehouseFilters, 'page'>) =>
  `warehouse:warehouses:${apiPath('', warehouseQuery(filters))}`;

// La primera página se lee a través de la copia del dispositivo; las demás, del servidor. Al
// cambiar de página o de filtro se sigue mostrando lo anterior hasta que llega lo nuevo.
function firstPageWithCopy<T>(
  userId: string,
  cacheKey: string,
  page: number,
  fetchPage: () => Promise<T>,
): Promise<CachedRead<T>> {
  return page > 1
    ? fetchPage().then((data) => ({ data }))
    : readThroughCache(userId, cacheKey, fetchPage);
}

// Las existencias: una fila por lote y calibre con más de 0 kg.
export const useStock = (userId: string | undefined, filters: StockFilters) =>
  useQuery({
    queryKey: queryKeys.warehouse.stock(filters),
    queryFn: ({ signal }) =>
      firstPageWithCopy(userId!, stockCacheKey(filters), filters.page, () =>
        apiFetch<StockPage>(
          apiPath('/api/stock', {
            ...stockQuery(filters),
            ordering: filters.ordering,
            page: pageOf(filters.page),
          }),
          { signal },
        ),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Los totales de G1 y G2 y los lotes con existencias, con los mismos filtros, sin paginar.
export const useStockSummary = (
  userId: string | undefined,
  filters: StockSummaryFilters,
) =>
  useQuery({
    queryKey: queryKeys.warehouse.summary(filters),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, stockSummaryCacheKey(filters), () =>
        apiFetch<StockSummary>(
          apiPath('/api/stock/summary', stockQuery(filters)),
          { signal },
        ),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Las salidas de cacao de todos los lotes, la más reciente primero, con las anuladas.
export const useExits = (
  userId: string | undefined,
  filters: ExitFilters,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.warehouse.exits(filters),
    queryFn: ({ signal }) =>
      firstPageWithCopy(userId!, exitsCacheKey(filters), filters.page, () =>
        apiFetch<StockExitPage>(
          apiPath('/api/stock/exits', {
            ...exitQuery(filters),
            page: pageOf(filters.page),
          }),
          { signal },
        ),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Lo que salió con esos filtros, en total y por motivo, sin contar lo anulado.
export const useExitSummary = (
  userId: string | undefined,
  filters: ExitSummaryFilters,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.warehouse.exitSummary(filters),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, exitSummaryCacheKey(filters), () =>
        apiFetch<ExitSummary>(
          apiPath('/api/stock/exits/summary', exitSummaryQuery(filters)),
          { signal },
        ),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Los lotes Clasificado por ingresar. El servidor los da solo a quien puede ingresarlos.
export const usePendingEntry = (
  userId: string | undefined,
  filters: PendingEntryFilters,
  enabled: boolean,
) =>
  useQuery({
    queryKey: queryKeys.warehouse.pending(filters),
    queryFn: ({ signal }) =>
      firstPageWithCopy(
        userId!,
        pendingEntryCacheKey(filters),
        filters.page,
        () =>
          apiFetch<PendingEntryPage>(
            apiPath('/api/stock/pending-entry', {
              ...pendingQuery(filters),
              page: pageOf(filters.page),
            }),
            { signal },
          ),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Las bodegas de las fincas que la cuenta alcanza (o de una sola), con copia de la primera página.
export const useWarehouses = (
  userId: string | undefined,
  filters: WarehouseFilters,
  enabled = true,
) =>
  useQuery({
    queryKey: queryKeys.warehouse.warehouses(filters),
    queryFn: ({ signal }) =>
      firstPageWithCopy(
        userId!,
        warehousesCacheKey(filters),
        filters.page,
        () =>
          apiFetch<WarehousePage>(
            apiPath('/api/warehouses', {
              ...warehouseQuery(filters),
              page: pageOf(filters.page),
            }),
            { signal },
          ),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Las ubicaciones con existencias de una bodega, para sugerirlas al ingresar. Solo con conexión:
// sin ella el formulario no se abre.
export const useStockLocations = (warehouseId: string | null) =>
  useQuery({
    queryKey: queryKeys.warehouse.locations(warehouseId ?? ''),
    queryFn: ({ signal }) =>
      apiFetch<{ results: string[] }>(
        apiPath('/api/stock/locations', { warehouse: warehouseId }),
        { signal },
      ).then(({ results }) => results),
    enabled: !!warehouseId,
  });

// El ingreso, las existencias y las salidas de un lote Clasificado o En bodega, con quién hizo cada
// cosa. Solo con conexión y con permiso de consultar existencias; sin él, la ficha usa lo que trae
// el lote.
export const useLotStock = (lotId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.warehouse.lot(lotId),
    queryFn: ({ signal }) =>
      apiFetch<LotStock>(`/api/stock/${encodeURIComponent(lotId)}`, {
        signal,
      }),
    enabled: enabled && !!lotId,
  });
