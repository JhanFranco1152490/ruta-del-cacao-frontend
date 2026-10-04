import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components, operations } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

import type { VarietyOption } from './variety-choices';

type Schemas = components['schemas'];
export type CacaoVariety = Schemas['CacaoVariety'];
export type CacaoVarietyCreateRequest = Schemas['CacaoVarietyCreateRequest'];
export type CacaoVarietyUpdateRequest =
  Schemas['PatchedCacaoVarietyUpdateRequest'];
export type PlotCharacterization = Schemas['PlotCharacterization'];
export type PlotCharacterizationWriteRequest =
  Schemas['PlotCharacterizationWriteRequest'];
type CacaoVarietyQuery = NonNullable<
  operations['cacao_varieties_list']['parameters']['query']
>;

export const DUPLICATE_VARIETY_CODE = 'duplicate_variety_name';

export const toVarietyOption = (variety: CacaoVariety): VarietyOption => ({
  id: variety.id,
  name: variety.name,
  isActive: variety.is_active,
});

// El catálogo no se pagina: tiene decenas de filas y quien lo usa las necesita todas.
export async function fetchCacaoVarieties(
  query: CacaoVarietyQuery = {},
  signal?: AbortSignal,
): Promise<CacaoVariety[]> {
  const params = new URLSearchParams();
  if (query.is_active !== undefined)
    params.set('is_active', String(query.is_active));
  if (query.search) params.set('search', query.search);
  const suffix = params.size ? `?${params}` : '';
  const { results } = await apiFetch<Schemas['CacaoVarietyList']>(
    `/api/cacao-varieties${suffix}`,
    { signal },
  );
  return results;
}

// Las variedades que ofrece la ficha de una parcela. Se guardan en el dispositivo para llenar la
// ficha sin conexión; la copia es por persona y se borra al cerrar sesión.
export const useActiveCacaoVarieties = (userId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.cacaoVarieties.active(),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, 'cacao-varieties:active', () =>
        fetchCacaoVarieties({ is_active: true }, signal),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
  });

// El catálogo completo para administrarlo. Es una pantalla de oficina: sin copia en el
// dispositivo. Búsqueda y filtros se aplican en la pantalla, porque la lista es corta.
export const useCacaoVarietyCatalog = () =>
  useQuery({
    queryKey: queryKeys.cacaoVarieties.list(),
    queryFn: ({ signal }) => fetchCacaoVarieties({}, signal),
  });

export const postCacaoVariety = (body: CacaoVarietyCreateRequest) =>
  apiFetch<CacaoVariety>('/api/cacao-varieties', { method: 'POST', body });

export const patchCacaoVariety = (
  id: string,
  body: CacaoVarietyUpdateRequest,
) =>
  apiFetch<CacaoVariety>(`/api/cacao-varieties/${id}`, {
    method: 'PATCH',
    body,
  });

// Cualquier cambio al catálogo se ve en la pantalla y en lo que ofrece la ficha.
function useInvalidateVarieties() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cacaoVarieties.all() });
}

// Sin red deben fallar en el acto: la gestión del catálogo es solo en línea.
export function useCreateCacaoVariety() {
  const invalidate = useInvalidateVarieties();
  return useMutation({
    networkMode: 'always',
    mutationFn: postCacaoVariety,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateCacaoVariety() {
  const invalidate = useInvalidateVarieties();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: CacaoVarietyUpdateRequest;
    }) => patchCacaoVariety(id, body),
    onSettled: () => invalidate(),
  });
}

// Las fichas de todas las parcelas de una finca, en una sola consulta: el detalle muestra el
// resumen de cada una sin pedirlas por separado. Las parcelas sin ficha no vienen.
export async function fetchFarmCharacterizations(
  farmId: string,
  signal?: AbortSignal,
): Promise<PlotCharacterization[]> {
  const params = new URLSearchParams({ farm: farmId });
  const { results } = await apiFetch<Schemas['PlotCharacterizationList']>(
    `/api/plot-characterizations?${params}`,
    { signal },
  );
  return results;
}

// `offlineFirst`: sin conexión se intenta igual y se cae a la copia del dispositivo, que guarda
// las fichas de la última vez que se abrió la finca con conexión.
export const useFarmCharacterizations = (
  userId: string | undefined,
  farmId: string,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.characterizations.byFarm(farmId),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `plot-characterizations:farm:${farmId}`, () =>
        fetchFarmCharacterizations(farmId, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// Registra o reemplaza la ficha completa de la parcela: la usa solo la cola del dispositivo.
export const putCharacterization = (
  plotId: string,
  body: PlotCharacterizationWriteRequest,
) =>
  apiFetch<PlotCharacterization>(`/api/plot-characterizations/${plotId}`, {
    method: 'PUT',
    body,
  });
