import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
export type FarmMunicipalityCount = Schemas['FarmMunicipalityCount'];
export type FarmMapPoint = Schemas['FarmMapPoint'];

// Lo que comparten el mapa y la lista: así los dos muestran siempre lo mismo.
export type FarmMapQuery = { search?: string; producer?: string };

function params(query: FarmMapQuery, municipality?: string) {
  const values = new URLSearchParams();
  if (query.search) values.set('search', query.search);
  if (query.producer) values.set('producer', query.producer);
  if (municipality) values.set('municipality', municipality);
  return values;
}

export const fetchFarmMunicipalityCounts = (
  query: FarmMapQuery,
  signal?: AbortSignal,
) =>
  apiFetch<FarmMunicipalityCount[]>(
    `/api/farms/map/municipalities?${params(query)}`,
    { signal },
  );

export const fetchFarmMapPoints = (
  municipality: string | null,
  query: FarmMapQuery,
  signal?: AbortSignal,
) =>
  apiFetch<FarmMapPoint[]>(
    `/api/farms/map/points?${params(query, municipality ?? undefined)}`,
    { signal },
  );

// `offlineFirst`: sin conexión se intenta igual y se cae a la copia del dispositivo en vez de
// quedar en pausa esperando la red.
export const useFarmMunicipalityCounts = (
  userId: string | undefined,
  query: FarmMapQuery,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.farms.mapCounts(query),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `farm-map:counts:${params(query)}`, () =>
        fetchFarmMunicipalityCounts(query, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
    placeholderData: keepPreviousData,
  });

// Sin municipio: todos los puntos del alcance (mapa libre).
export const useFarmMapPoints = (
  userId: string | undefined,
  municipality: string | null,
  query: FarmMapQuery,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.farms.mapPoints(municipality ?? '', query),
    queryFn: ({ signal }) =>
      readThroughCache(
        userId!,
        `farm-map:points:${params(query, municipality ?? undefined)}`,
        () => fetchFarmMapPoints(municipality, query, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
