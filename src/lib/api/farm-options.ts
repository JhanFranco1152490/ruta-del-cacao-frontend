import { useQuery } from '@tanstack/react-query';

import { readThroughCache } from '@/lib/offline/cached-read';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];

export type FarmOption = { id: string; name: string; isActive: boolean };

// El tope de una página de la API. Un productor no tiene tantas fincas; si las tuviera, el filtro
// ofrece las primeras por nombre y la búsqueda sigue encontrando las demás.
export const FARM_OPTIONS_SIZE = 100;

export async function fetchFarmOptions(
  producer: string | undefined,
  signal?: AbortSignal,
): Promise<FarmOption[]> {
  const params = new URLSearchParams({
    page: '1',
    page_size: String(FARM_OPTIONS_SIZE),
  });
  if (producer) params.set('producer', producer);
  const page = await apiFetch<Schemas['PaginatedFarmList']>(
    `/api/farms?${params}`,
    { signal },
  );
  return page.results.map((farm) => ({
    id: farm.id,
    name: farm.name,
    isActive: farm.is_active,
  }));
}

// Las fincas de un productor (o las propias, sin `producer`) para elegir una en un filtro. Vive
// aquí y no en el dominio de fincas porque la piden otros dominios. Con copia en el dispositivo,
// como las listas que acompaña.
export const useFarmOptions = (
  userId: string | undefined,
  producer: string | undefined,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.farms.options(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `farm-options:${producer ?? ''}`, () =>
        fetchFarmOptions(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
