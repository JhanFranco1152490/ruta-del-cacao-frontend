import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components, operations } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
export type PestDisease = Schemas['PestDisease'];
export type PestDiseaseKind = Schemas['PestDiseaseKindEnum'];
export type PestDiseaseCreateRequest = Schemas['PestDiseaseCreateRequest'];
export type PestDiseaseUpdateRequest =
  Schemas['PatchedPestDiseaseUpdateRequest'];
type PestDiseaseQuery = NonNullable<
  operations['pests_diseases_list']['parameters']['query']
>;

export const DUPLICATE_PEST_DISEASE_CODE = 'duplicate_pest_disease_name';
export const ACTIVE_PESTS_DISEASES_CACHE_KEY = 'pests-diseases:active';

// El catálogo no se pagina: tiene pocas filas y quien lo usa las necesita todas.
export async function fetchPestsDiseases(
  query: PestDiseaseQuery = {},
  signal?: AbortSignal,
): Promise<PestDisease[]> {
  const params = new URLSearchParams();
  if (query.is_active !== undefined)
    params.set('is_active', String(query.is_active));
  if (query.search) params.set('search', query.search);
  const suffix = params.size ? `?${params}` : '';
  const { results } = await apiFetch<Schemas['PestDiseaseList']>(
    `/api/pests-diseases${suffix}`,
    { signal },
  );
  return results;
}

// Las que ofrece el buscador de la planilla del monitoreo. Se guardan en el dispositivo para
// registrar un monitoreo sin conexión; la copia es por persona y se borra al cerrar sesión.
export const useActivePestsDiseases = (userId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.pestsDiseases.active(),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, ACTIVE_PESTS_DISEASES_CACHE_KEY, () =>
        fetchPestsDiseases({ is_active: true }, signal),
      ),
    enabled: !!userId,
    networkMode: 'offlineFirst',
  });

// El catálogo completo para administrarlo. Es una pantalla de oficina: sin copia en el
// dispositivo. Búsqueda y filtros se aplican en la pantalla, porque la lista es corta.
export const usePestDiseaseCatalog = () =>
  useQuery({
    queryKey: queryKeys.pestsDiseases.list(),
    queryFn: ({ signal }) => fetchPestsDiseases({}, signal),
  });

export const postPestDisease = (body: PestDiseaseCreateRequest) =>
  apiFetch<PestDisease>('/api/pests-diseases', { method: 'POST', body });

export const patchPestDisease = (id: string, body: PestDiseaseUpdateRequest) =>
  apiFetch<PestDisease>(`/api/pests-diseases/${id}`, {
    method: 'PATCH',
    body,
  });

// Cualquier cambio al catálogo se ve en la pantalla y en lo que ofrece la planilla.
function useInvalidatePestsDiseases() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.pestsDiseases.all() });
}

// Sin red deben fallar en el acto: la gestión del catálogo es solo en línea.
export function useCreatePestDisease() {
  const invalidate = useInvalidatePestsDiseases();
  return useMutation({
    networkMode: 'always',
    mutationFn: postPestDisease,
    onSuccess: () => invalidate(),
  });
}

// También activa y desactiva (`is_active`).
export function useUpdatePestDisease() {
  const invalidate = useInvalidatePestsDiseases();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: PestDiseaseUpdateRequest;
    }) => patchPestDisease(id, body),
    onSettled: () => invalidate(),
  });
}
