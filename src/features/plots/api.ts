import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components, operations } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
export type Plot = Schemas['Plot'];
export type ApiVertex = Schemas['Vertex'];
export type PlotCreateRequest = Schemas['PlotCreateRequest'];
export type PlotUpdateRequest = Schemas['PatchedPlotUpdateRequest'];

// Tope de la API por página. Una finca con más parcelas que esto no es realista; si ocurriera,
// la pantalla lo avisa en vez de mostrar una lista que parece completa.
export const PLOTS_PAGE_SIZE = 100;

export type FarmPlots = { plots: Plot[]; hasMore: boolean };

// La pantalla general pagina como la de fincas.
export const PLOT_LIST_PAGE_SIZE = 20;

type PlotListParams = NonNullable<
  operations['plots_list']['parameters']['query']
>;

export type PlotQuery = {
  search?: string;
  farm?: string;
  producer?: string;
  characterization?: PlotListParams['characterization'];
  ordering?: PlotListParams['ordering'];
  page?: number;
  // Por defecto, una página de la lista.
  pageSize?: number;
};

export const fetchPlots = (query: PlotQuery, signal?: AbortSignal) => {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.farm) params.set('farm', query.farm);
  if (query.producer) params.set('producer', query.producer);
  if (query.characterization)
    params.set('characterization', query.characterization);
  if (query.ordering) params.set('ordering', query.ordering);
  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(query.pageSize ?? PLOT_LIST_PAGE_SIZE));
  return apiFetch<Schemas['PaginatedPlotList']>(`/api/plots?${params}`, {
    signal,
  });
};

// `offlineFirst`, como las parcelas de una finca: sin conexión se cae a la copia de esta misma
// consulta, guardada la última vez que se vio con conexión.
export const usePlots = (userId: string | undefined, query: PlotQuery) =>
  useQuery({
    queryKey: queryKeys.plots.list(query),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `plots:list:${JSON.stringify(query)}`, () =>
        fetchPlots(query, signal),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// La parcela que cierra la página anterior, para saber si el primer grupo de esta página empezó
// allá ("continúa"). Se pide sola: con páginas de una parcela, la página número `(n-1)·20` es
// justo esa. Sin ella (sin conexión, primera página) el grupo simplemente no lo dice.
export const usePlotBefore = (
  userId: string | undefined,
  query: PlotQuery,
  { enabled = true } = {},
) => {
  const page = query.page ?? 1;
  const position = (page - 1) * PLOT_LIST_PAGE_SIZE;
  return useQuery({
    queryKey: queryKeys.plots.list({ ...query, before: true }),
    queryFn: async ({ signal }) => {
      const result = await fetchPlots(
        { ...query, page: position, pageSize: 1 },
        signal,
      );
      return result.results[0] ?? null;
    },
    enabled: enabled && !!userId && page > 1,
  });
};

export const fetchPlot = (id: string, signal?: AbortSignal) =>
  apiFetch<Plot>(`/api/plots/${id}`, { signal });

// Parcelas sueltas por su id (las que tienen algo pendiente con error en el dispositivo), con
// copia para leerlas sin conexión. Una que ya no existe simplemente no viene.
export function usePlotsByIds(
  userId: string | undefined,
  ids: readonly string[],
) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.plots.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        readThroughCache(userId!, `plot:${id}`, () => fetchPlot(id, signal)),
      enabled: !!userId,
      networkMode: 'offlineFirst' as const,
    })),
    combine: (results) => ({
      plots: results.flatMap((result) =>
        result.data ? [result.data.data] : [],
      ),
      isLoading: results.some(
        (result) => result.isPending && result.fetchStatus !== 'paused',
      ),
    }),
  });
}

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

export const postPlot = (body: PlotCreateRequest) =>
  apiFetch<Plot>('/api/plots', { method: 'POST', body });
export const patchPlot = (id: string, body: PlotUpdateRequest) =>
  apiFetch<Plot>(`/api/plots/${id}`, { method: 'PATCH', body });

type PlotDeleteQuery = operations['plots_destroy']['parameters']['query'];

// La versión leída va en la URL y no en un cuerpo, como en fincas.
export const deletePlot = (id: string, expectedVersion: number) => {
  const query: PlotDeleteQuery = { expected_version: expectedVersion };
  const params = new URLSearchParams({
    expected_version: String(query.expected_version),
  });
  return apiFetch<void>(`/api/plots/${id}?${params}`, { method: 'DELETE' });
};

// Lo que cambia las parcelas de una finca o su área asignada: la lista de la finca y la finca
// misma (que trae el área asignada) se vuelven a pedir. Lo usan las acciones en línea y la cola.
export const plotReadsOf = (farmId: string) => [
  queryKeys.plots.byFarm(farmId),
  queryKeys.plots.lists(),
  queryKeys.farms.detail(farmId),
  queryKeys.farms.lists(),
];

function useInvalidatePlotsOf() {
  const queryClient = useQueryClient();
  return (farmId: string) => {
    for (const queryKey of plotReadsOf(farmId)) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
}

// Activar o desactivar se hace en línea: la persona necesita ver el resultado en el momento, y
// un cambio de estado no es una captura de campo.
export function useChangePlotStatus() {
  const invalidate = useInvalidatePlotsOf();
  return useMutation({
    // Sin red debe fallar en el acto con un aviso: por defecto TanStack la dejaría en pausa y la
    // ejecutaría sola al volver la red, cuando ya nadie lo está pidiendo.
    networkMode: 'always',
    mutationFn: ({
      id,
      isActive,
      expectedVersion,
    }: {
      id: string;
      farmId: string;
      isActive: boolean;
      expectedVersion: number;
    }) =>
      patchPlot(id, { is_active: isActive, expected_version: expectedVersion }),
    onSettled: (_, error, { farmId }) => {
      // Con una versión obsoleta o un rechazo de reglas, lo que hay en pantalla ya no es lo del
      // servidor: se vuelve a pedir para que el siguiente intento use lo vigente.
      if (!error || isApiError(error)) invalidate(farmId);
    },
  });
}

// Eliminar una parcela creada por error es solo en línea: no pasa por la cola del dispositivo.
export function useDeletePlot() {
  const invalidate = useInvalidatePlotsOf();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      farmId: string;
      expectedVersion: number;
    }) => deletePlot(id, expectedVersion),
    onSettled: (_, error, { farmId }) => {
      if (!error || isApiError(error)) invalidate(farmId);
    },
  });
}
