import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

import type { HistoryQuery } from './history-filters';

type Schemas = components['schemas'];
export type HealthHistory = Schemas['PhytosanitaryHistory'];
export type PestSummary = Schemas['PestSummary'];

const queryString = (query: HistoryQuery) =>
  new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  ).toString();

// Cada combinación de filtros y de página que se abrió con conexión guarda su copia.
export const historyCacheKey = (query: HistoryQuery) =>
  `phytosanitary-history:${queryString(query)}`;

async function fetchHistory(
  query: HistoryQuery,
  signal?: AbortSignal,
): Promise<HealthHistory> {
  const suffix = queryString(query);
  return apiFetch<HealthHistory>(
    `/api/phytosanitary-history${suffix ? `?${suffix}` : ''}`,
    { signal },
  );
}

// Los monitoreos realizados de todo lo que alcanza la cuenta, del más reciente al más antiguo y de
// a 20. Con `plot` trae además el resumen por plaga. Sin conexión se ve la última copia de los
// mismos filtros y página. `query` nulo no pide nada (los filtros no son válidos). Al cambiar de
// página o de filtro se sigue mostrando lo anterior hasta que llega lo nuevo.
export const useHealthHistory = (
  userId: string | undefined,
  query: HistoryQuery | null,
) =>
  useQuery({
    queryKey: queryKeys.health.history(query ?? {}),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, historyCacheKey(query!), () =>
        fetchHistory(query!, signal),
      ),
    enabled: !!userId && query !== null,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });
