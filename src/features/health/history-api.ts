import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

import type { PlotHistoryQuery } from './history-filters';

type Schemas = components['schemas'];
export type PlotHistory = Schemas['PhytosanitaryHistory'];
export type PestSummary = Schemas['PestSummary'];

const queryString = (query: PlotHistoryQuery) =>
  new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  ).toString();

// Cada parcela guarda la copia de cada combinación de filtros que se abrió con conexión.
export const plotHistoryCacheKey = (plotId: string, query: PlotHistoryQuery) =>
  `phytosanitary-history:${plotId}:${queryString(query)}`;

async function fetchPlotHistory(
  plotId: string,
  query: PlotHistoryQuery,
  signal?: AbortSignal,
): Promise<PlotHistory> {
  const suffix = queryString(query);
  return apiFetch<PlotHistory>(
    `/api/plots/${plotId}/phytosanitary-history${suffix ? `?${suffix}` : ''}`,
    { signal },
  );
}

// Los monitoreos realizados de una parcela, del más reciente al más antiguo, con el resumen por
// plaga. Sin paginar: una parcela tiene pocos monitoreos al año. Sin conexión se ve la última copia
// de los mismos filtros. `query` nulo no pide nada (los filtros no son válidos).
export const usePlotHistory = (
  userId: string | undefined,
  plotId: string,
  query: PlotHistoryQuery | null,
) =>
  useQuery({
    queryKey: queryKeys.health.history(plotId, query ?? {}),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, plotHistoryCacheKey(plotId, query!), () =>
        fetchPlotHistory(plotId, query!, signal),
      ),
    enabled: !!userId && !!plotId && query !== null,
    networkMode: 'offlineFirst',
  });
