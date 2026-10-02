import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { LIST_REFETCH_INTERVAL_MS } from '@/lib/query-client';

type Schemas = components['schemas'];
export type Farm = Schemas['Farm'];
export type FarmPage = Schemas['PaginatedFarmList'];
export type FarmCreateRequest = Schemas['FarmCreateRequest'];
export type FarmUpdateRequest = Schemas['PatchedFarmUpdateRequest'];

export const PAGE_SIZE = 20;

export type FarmQuery = {
  search?: string;
  page?: number;
  municipality?: string;
  producer?: string;
};

function listPath(query: FarmQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.municipality) params.set('municipality', query.municipality);
  if (query.producer) params.set('producer', query.producer);
  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(PAGE_SIZE));
  return `/api/farms?${params}`;
}

export const fetchFarms = (query: FarmQuery, signal?: AbortSignal) =>
  apiFetch<FarmPage>(listPath(query), { signal });
export const fetchFarm = (id: string, signal?: AbortSignal) =>
  apiFetch<Farm>(`/api/farms/${id}`, { signal });
export const postFarm = (body: FarmCreateRequest) =>
  apiFetch<Farm>('/api/farms', { method: 'POST', body });
export const patchFarm = (id: string, body: FarmUpdateRequest) =>
  apiFetch<Farm>(`/api/farms/${id}`, { method: 'PATCH', body });

export const useFarms = (query: FarmQuery) =>
  useQuery({
    queryKey: queryKeys.farms.list(query),
    queryFn: ({ signal }) => fetchFarms(query, signal),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
    // Al paginar o buscar se conserva la página anterior en pantalla hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });

export const useFarm = (
  id: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnMount?: boolean | 'always';
  },
) =>
  useQuery({
    queryKey: queryKeys.farms.detail(id),
    queryFn: ({ signal }) => fetchFarm(id, signal),
    ...options,
  });

// Activar o desactivar se hace en línea: la persona necesita ver el resultado en el momento, y
// un cambio de estado no es una captura de campo.
export function useChangeFarmStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      isActive,
      expectedVersion,
    }: {
      id: string;
      isActive: boolean;
      expectedVersion: number;
    }) =>
      patchFarm(id, { is_active: isActive, expected_version: expectedVersion }),
    onSuccess: (farm) => {
      queryClient.setQueryData(queryKeys.farms.detail(farm.id), farm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.farms.lists() });
    },
    onError: (error) => {
      // Con una versión obsoleta la lista en pantalla ya no es la del servidor: se vuelve a
      // pedir para que el siguiente intento use la versión vigente.
      if (isApiError(error) && error.code === 'stale_version') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.farms.all() });
      }
    },
  });
}

// El esquema OpenAPI no documenta el cuerpo del DELETE (la API sí lo exige): se tipa aquí hasta
// que el backend lo declare y el tipo salga generado.
type FarmDeleteRequest = { expected_version: number };

export const deleteFarm = (id: string, expectedVersion: number) =>
  apiFetch<void>(`/api/farms/${id}`, {
    method: 'DELETE',
    body: { expected_version: expectedVersion } satisfies FarmDeleteRequest,
  });

// Eliminar una finca creada por error es solo en línea: no pasa por la cola del dispositivo.
export function useDeleteFarm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => deleteFarm(id, expectedVersion),
    onSuccess: (_, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.farms.detail(id) });
      // La lista y el mapa (conteos y puntos) dejan de mostrarla.
      void queryClient.invalidateQueries({ queryKey: queryKeys.farms.all() });
    },
  });
}
