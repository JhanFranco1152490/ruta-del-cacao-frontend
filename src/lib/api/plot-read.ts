import { useQuery } from '@tanstack/react-query';

import { readThroughCache } from '@/lib/offline/cached-read';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Plot = components['schemas']['Plot'];

export const fetchPlot = (id: string, signal?: AbortSignal) =>
  apiFetch<Plot>(`/api/plots/${id}`, { signal });

// La copia de una parcela suelta en el dispositivo, para leerla sin conexión.
export const plotCacheKey = (id: string) => `plot:${id}`;

// Una parcela leída sola, por su id: la que abre una pantalla de otro dominio (su historial
// fitosanitario). Sin conexión, su última copia.
export const usePlot = (userId: string | undefined, id: string) =>
  useQuery({
    queryKey: queryKeys.plots.detail(id),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, plotCacheKey(id), () => fetchPlot(id, signal)),
    enabled: !!userId && !!id,
    networkMode: 'offlineFirst',
  });
