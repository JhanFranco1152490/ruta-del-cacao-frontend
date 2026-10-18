import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];

export type PostharvestFacility = Schemas['PostharvestFacility'];

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const facilitiesCacheKey = (producer: string | null) =>
  producer
    ? `postharvest-facilities:producer:${producer}`
    : 'postharvest-facilities';

// Todos los cajones y marquesinas del productor, en sus tres estados y sin paginar: son pocos, y
// la finca, los filtros y el orden corren en el dispositivo, también sin conexión. `producer`
// solo lo envía la cuenta técnica.
export async function fetchFacilities(
  producer: string | null,
  signal?: AbortSignal,
): Promise<PostharvestFacility[]> {
  const params = producer ? `?${new URLSearchParams({ producer })}` : '';
  const { results } = await apiFetch<Schemas['PostharvestFacilityList']>(
    `/api/postharvest-facilities${params}`,
    { signal },
  );
  return results;
}

export const useFacilities = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.facilities.list(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, facilitiesCacheKey(producer), () =>
        fetchFacilities(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
