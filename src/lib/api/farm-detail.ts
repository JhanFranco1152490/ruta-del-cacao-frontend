import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

export type Farm = components['schemas']['Farm'];

export const fetchFarm = (id: string, signal?: AbortSignal) =>
  apiFetch<Farm>(`/api/farms/${id}`, { signal });

// La finca para una pantalla que la muestra, y que también se lee sin conexión: sin respuesta
// del servidor devuelve la última copia con su fecha. `offlineFirst`: sin red se intenta igual
// en vez de quedar en pausa. Está aquí y no en el dominio de fincas porque el detalle de finca y
// el editor de parcelas la necesitan, y ningún dominio importa de la carpeta de otro.
export const useFarmDetail = (userId: string | undefined, id: string) =>
  useQuery({
    queryKey: queryKeys.farms.detailView(id),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `farm:${id}`, () => fetchFarm(id, signal)),
    enabled: !!userId,
    networkMode: 'offlineFirst',
  });
