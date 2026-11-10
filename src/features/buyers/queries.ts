import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import { readThroughCache } from '@/lib/offline/cached-read';

import type { Buyer, BuyerList } from './api';

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const buyersCacheKey = (producer: string | null) =>
  producer ? `buyers:producer:${producer}` : 'buyers';

// El directorio completo del productor, activos e inactivos y sin paginar: son pocos, y la búsqueda,
// los filtros y el orden corren en el dispositivo, también sin conexión. `producer` solo lo envía
// la cuenta técnica.
export async function fetchBuyers(
  producer: string | null,
  signal?: AbortSignal,
): Promise<Buyer[]> {
  const params = producer ? `?${new URLSearchParams({ producer })}` : '';
  const { results } = await apiFetch<BuyerList>(`/api/buyers${params}`, {
    signal,
  });
  return results;
}

export const useBuyers = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.buyers.list(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, buyersCacheKey(producer), () =>
        fetchBuyers(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });
