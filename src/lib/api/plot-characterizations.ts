import { useQuery } from '@tanstack/react-query';

import { readThroughCache } from '@/lib/offline/cached-read';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];
type PlotCharacterization = Schemas['PlotCharacterization'];

// Las fichas de una lista de parcelas (las de la página de una pantalla general), en una sola
// consulta. El servidor acepta hasta 100, más que una página.
export async function fetchPlotsCharacterizations(
  plotIds: readonly string[],
  signal?: AbortSignal,
): Promise<PlotCharacterization[]> {
  const params = new URLSearchParams({ plots: plotIds.join(',') });
  const { results } = await apiFetch<Schemas['PlotCharacterizationList']>(
    `/api/plot-characterizations?${params}`,
    { signal },
  );
  return results;
}

// Sin parcelas no hay nada que pedir: el servidor exige al menos una. El orden de los ids no
// cambia la respuesta, así que se ordenan para que la clave y la copia sean las mismas.
export function usePlotsCharacterizations(
  userId: string | undefined,
  plotIds: readonly string[],
  { enabled = true } = {},
) {
  const ids = [...plotIds].sort();
  return useQuery({
    queryKey: queryKeys.characterizations.byPlots(ids),
    queryFn: ({ signal }) =>
      readThroughCache(
        userId!,
        `plot-characterizations:plots:${ids.join(',')}`,
        () => fetchPlotsCharacterizations(ids, signal),
      ),
    enabled: enabled && !!userId && ids.length > 0,
    networkMode: 'offlineFirst',
  });
}
