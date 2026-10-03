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
