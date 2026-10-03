import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components, operations } from '@/lib/api/schema';
import {
  fetchMunicipalities,
  useMunicipalities,
  useMunicipalityName,
  type Municipality,
} from '@/lib/api/municipalities';
import { LIST_REFETCH_INTERVAL_MS } from '@/lib/query-client';

type Schemas = components['schemas'];
export type Producer = Schemas['ProducerDetail'];
export type ProducerListItem = Schemas['ProducerList'];
export type ProducerPage = Schemas['PaginatedProducerListList'];
export type ProducerRequest = Schemas['ProducerRequest'];
export type ProducerUpdate = Schemas['PatchedProducerUpdateRequest'];
export type ProducerStatus = Schemas['StatusEnum'];

// El catálogo de municipios vive en lib/api porque también lo usan las cuentas; aquí se
// reexporta para las pantallas de productores.
export {
  fetchMunicipalities,
  useMunicipalities,
  useMunicipalityName,
  type Municipality,
};

export const PAGE_SIZE = 20;

export type ProducerQuery = {
  search?: string;
  status?: ProducerStatus;
  municipality?: string;
  page?: number;
};

function listPath(query: ProducerQuery) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.municipality) params.set('municipality_code', query.municipality);
  params.set('page', String(query.page ?? 1));
  params.set('page_size', String(PAGE_SIZE));
  return `/api/producers?${params}`;
}

export const fetchProducers = (query: ProducerQuery, signal?: AbortSignal) =>
  apiFetch<ProducerPage>(listPath(query), { signal });
export const fetchProducer = (id: string, signal?: AbortSignal) =>
  apiFetch<Producer>(`/api/producers/${id}`, { signal });

export const useProducers = (query: ProducerQuery) =>
  useQuery({
    queryKey: queryKeys.producers.list(query),
    queryFn: ({ signal }) => fetchProducers(query, signal),
    refetchInterval: LIST_REFETCH_INTERVAL_MS,
    // Al paginar o filtrar se conserva la página anterior en pantalla hasta que llega la nueva.
    placeholderData: keepPreviousData,
  });

export const useProducer = (id: string, options?: { staleTime?: number }) =>
  useQuery({
    queryKey: queryKeys.producers.detail(id),
    queryFn: ({ signal }) => fetchProducer(id, signal),
    ...options,
  });

function useCacheProducer() {
  const queryClient = useQueryClient();
  return (producer: Producer) => {
    queryClient.setQueryData(queryKeys.producers.detail(producer.id), producer);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.producers.lists(),
    });
  };
}

// Una versión obsoleta significa que la ficha en caché ya no es la del servidor: se vuelve a
// pedir para que cancelar muestre lo vigente y el siguiente intento use la versión nueva, en
// vez de repetir el mismo 409 hasta recargar la página.
function useRefreshOnStaleVersion() {
  const queryClient = useQueryClient();
  return (error: unknown, id: string) => {
    if (isApiError(error) && error.code === 'stale_version') {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.producers.detail(id),
      });
    }
  };
}

export function useCreateProducer() {
  const cacheProducer = useCacheProducer();
  return useMutation({
    mutationFn: (body: ProducerRequest) =>
      apiFetch<Producer>('/api/producers', { method: 'POST', body }),
    onSuccess: cacheProducer,
  });
}

export function useUpdateProducer() {
  const cacheProducer = useCacheProducer();
  const refreshOnStaleVersion = useRefreshOnStaleVersion();
  return useMutation({
    mutationFn: ({
      id,
      input,
      expectedVersion,
    }: {
      id: string;
      input: Omit<ProducerUpdate, 'expected_version'>;
      expectedVersion: number;
    }) =>
      apiFetch<Producer>(`/api/producers/${id}`, {
        method: 'PATCH',
        body: { ...input, expected_version: expectedVersion },
      }),
    onSuccess: cacheProducer,
    onError: (error, { id }) => refreshOnStaleVersion(error, id),
  });
}

type ProducerDeleteQuery = NonNullable<
  operations['producers_destroy']['parameters']['query']
>;

// La versión leída va en la URL: el servidor no lee un cuerpo en DELETE.
export const deleteProducer = (id: string, expectedVersion: number) => {
  const query: ProducerDeleteQuery = { expected_version: expectedVersion };
  const params = new URLSearchParams({
    expected_version: String(query.expected_version),
  });
  return apiFetch<void>(`/api/producers/${encodeURIComponent(id)}?${params}`, {
    method: 'DELETE',
  });
};

// Eliminar un productor creado por error es solo en línea y la persona espera la respuesta: sin
// red debe fallar en el acto. Por defecto TanStack la dejaría en pausa y la ejecutaría sola al
// volver la red, cuando ya nadie lo está pidiendo.
export function useDeleteProducer() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => deleteProducer(id, expectedVersion),
    onSuccess: (_, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.producers.detail(id) });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.producers.all(),
      });
      // Sus fincas se eliminan con él: la lista y el mapa dejan de mostrarlas.
      void queryClient.invalidateQueries({ queryKey: queryKeys.farms.all() });
    },
  });
}

export function useChangeProducerStatus() {
  const cacheProducer = useCacheProducer();
  const refreshOnStaleVersion = useRefreshOnStaleVersion();
  return useMutation({
    mutationFn: ({
      id,
      status,
      expectedVersion,
    }: {
      id: string;
      status: ProducerStatus;
      expectedVersion: number;
    }) =>
      apiFetch<Producer>(`/api/producers/${id}/status`, {
        method: 'PATCH',
        body: { status, expected_version: expectedVersion },
      }),
    onSuccess: cacheProducer,
    onError: (error, { id }) => refreshOnStaleVersion(error, id),
  });
}
