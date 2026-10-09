import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ProducerRef } from '@/lib/format/producer';
import { readThroughCache } from '@/lib/offline/cached-read';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];

// Una finca para elegirla en un filtro o nombrarla en una lista de otro dominio.
export type FarmOption = {
  id: string;
  name: string;
  isActive: boolean;
  municipality: string;
  producer: ProducerRef;
};

type FarmOptionsQuery = {
  producer?: string;
  search?: string;
  pageSize: number;
};

// El tope de una página de la API: lo que se pide para nombrar las fincas de un productor.
export const FARM_OPTIONS_SIZE = 100;
// Cuántas ofrece el buscador a la vez: con más, la persona afina lo que escribe.
export const FARM_SEARCH_SIZE = 20;

const toOption = (farm: Schemas['Farm']): FarmOption => ({
  id: farm.id,
  name: farm.name,
  isActive: farm.is_active,
  municipality: farm.municipality.name,
  producer: farm.producer,
});

export async function fetchFarmOptions(
  query: FarmOptionsQuery,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    page: '1',
    page_size: String(query.pageSize),
  });
  if (query.producer) params.set('producer', query.producer);
  if (query.search) params.set('search', query.search);
  const page = await apiFetch<Schemas['PaginatedFarmList']>(
    `/api/farms?${params}`,
    { signal },
  );
  return { options: page.results.map(toOption), count: page.count };
}

// Las fincas de un productor (o las propias, sin `producer`), para nombrar las de una lista de
// otro dominio aunque no vengan en ella (una parcela que solo está en el dispositivo). Con copia
// en el dispositivo, como las listas que acompaña. Vive aquí y no en el dominio de fincas porque
// la piden otros dominios.
export const useFarmOptions = (
  userId: string | undefined,
  producer: string | undefined,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.farms.options(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `farm-options:${producer ?? ''}`, () =>
        fetchFarmOptions({ producer, pageSize: FARM_OPTIONS_SIZE }, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// Las fincas que calzan con lo que se escribe en un buscador, solo con conexión: es un filtro, y
// sin red la lista ya muestra lo que hay en el dispositivo.
export const useFarmSearch = (search: string, producer: string | undefined) =>
  useQuery({
    queryKey: queryKeys.farms.search({ search, producer }),
    queryFn: ({ signal }) =>
      fetchFarmOptions(
        { search: search || undefined, producer, pageSize: FARM_SEARCH_SIZE },
        signal,
      ),
    placeholderData: keepPreviousData,
  });
