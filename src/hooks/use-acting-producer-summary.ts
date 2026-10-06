'use client';

import { useQuery } from '@tanstack/react-query';

import { useActingProducer } from '@/hooks/use-acting-producer';
import { useSession } from '@/hooks/use-session';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { ProducerSummary } from '@/lib/api/producer-options';
import { readThroughCache } from '@/lib/offline/cached-read';

// Quién es el productor bajo el que opera la pestaña, para nombrarlo en el encabezado y en el
// título. Se lee a través de la copia del dispositivo: sin conexión sigue mostrando el nombre y
// el código del productor ya elegido, aunque no se pueda elegir otro.
export function useActingProducerSummary() {
  const { data: user } = useSession();
  const { producerId } = useActingProducer();
  return useQuery({
    queryKey: queryKeys.producers.acting(producerId ?? ''),
    queryFn: ({ signal }) =>
      readThroughCache(user!.id, `producer:${producerId}`, () =>
        apiFetch<ProducerSummary>(`/api/producers/${producerId}`, { signal }),
      ),
    select: (read) => read.data,
    enabled: !!user?.id && !!producerId,
    networkMode: 'offlineFirst',
    retry: false,
    staleTime: 60_000,
  });
}
