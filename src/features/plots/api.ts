import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
export type Plot = Schemas['Plot'];
export type PlotVertex = Schemas['Vertex'];

// Tope de la API por página. Una finca con más parcelas que esto no es realista; si ocurriera,
// la pantalla lo avisa en vez de mostrar una lista que parece completa.
export const PLOTS_PAGE_SIZE = 100;

export type FarmPlots = { plots: Plot[]; hasMore: boolean };

export const fetchFarmPlots = async (
  farmId: string,
  signal?: AbortSignal,
): Promise<FarmPlots> => {
  const params = new URLSearchParams({
    farm: farmId,
    page_size: String(PLOTS_PAGE_SIZE),
  });
  const page = await apiFetch<Schemas['PaginatedPlotList']>(
    `/api/plots?${params}`,
    { signal },
  );
  return { plots: page.results, hasMore: page.next !== null };
};

// `offlineFirst`: sin conexión se intenta igual y se cae a la copia del dispositivo, que guarda
// las parcelas con sus polígonos de la última vez que se abrió la finca con conexión.
export const useFarmPlots = (
  userId: string | undefined,
  farmId: string,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.plots.byFarm(farmId),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `plots:farm:${farmId}`, () =>
        fetchFarmPlots(farmId, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
