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

type Schemas = components['schemas'];
export type Producer = Schemas['Producer'];
export type ProducerListItem = Schemas['ProducerList'];
export type ProducerPage = Schemas['PaginatedProducerListList'];
export type ProducerRequest = Schemas['ProducerRequest'];
export type ProducerUpdate = Schemas['PatchedProducerUpdateRequest'];
export type ProducerStatus = Schemas['StatusEnum'];

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
