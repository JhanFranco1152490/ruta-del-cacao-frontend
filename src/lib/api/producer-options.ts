import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];
export type ProducerOption = Schemas['ProducerList'];
export type ProducerSummary = Schemas['ProducerDetail'];

// Cuántos productores ofrece el selector a la vez: con más, la persona afina la búsqueda.
export const PRODUCER_OPTIONS_SIZE = 20;

// Las pantallas de la asociación eligen "de qué productor" están mirando; esto vive aquí y no
// en el dominio de productores para que otros dominios lo usen sin importarse entre sí.
export const useProducerOptions = (search: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.producers.list({ options: true, search }),
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        status: 'active',
        page: '1',
        page_size: String(PRODUCER_OPTIONS_SIZE),
      });
      if (search) params.set('search', search);
      return apiFetch<Schemas['PaginatedProducerListList']>(
        `/api/producers?${params}`,
        { signal },
      );
    },
    enabled,
    placeholderData: keepPreviousData,
  });

// El detalle trae `association_access`, que el listado no informa.
export const useProducerSummary = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.producers.detail(id ?? ''),
    queryFn: ({ signal }) =>
      apiFetch<ProducerSummary>(
        `/api/producers/${encodeURIComponent(id ?? '')}`,
        { signal },
      ),
    enabled: Boolean(id),
  });
