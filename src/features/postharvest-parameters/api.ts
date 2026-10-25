import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];

export type PostharvestParameters = Schemas['PostharvestParameters'];

export const PARAMETERS_ERROR = {
  staleVersion: 'stale_version',
} as const;

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const parametersCacheKey = (producer: string | null) =>
  producer
    ? `postharvest-parameters:producer:${producer}`
    : 'postharvest-parameters';

// Los parámetros vigentes del productor: los que guardó o la línea base. `producer` solo lo envía
// la cuenta técnica.
export const fetchParameters = (
  producer: string | null,
  signal?: AbortSignal,
) =>
  apiFetch<PostharvestParameters>(
    apiPath('/api/postharvest-parameters', { producer }),
    { signal },
  );

export const useParameters = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.parameters.detail(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, parametersCacheKey(producer), () =>
        fetchParameters(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// Volver a leer también renueva la copia del dispositivo. Se hace también al fallar: con una versión
// obsoleta, el siguiente intento debe partir de los valores vigentes.
function useInvalidateParameters() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.parameters.all() });
}

// Cambiar y restablecer son solo en línea: sin red fallan en el acto, en vez de quedar en pausa y
// ejecutarse solos al volver la red, cuando ya nadie los está pidiendo.
export function useSaveParameters(producer: string | null) {
  const invalidate = useInvalidateParameters();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      expectedVersion,
      values,
    }: {
      expectedVersion: number;
      values: Schemas['PostharvestValuesInputRequest'];
    }) =>
      apiFetch<PostharvestParameters>('/api/postharvest-parameters', {
        method: 'PUT',
        body: {
          expected_version: expectedVersion,
          values,
          ...(producer && { producer }),
        },
      }),
    onSettled: () => invalidate(),
  });
}

export function useResetParameters(producer: string | null) {
  const invalidate = useInvalidateParameters();
  return useMutation({
    networkMode: 'always',
    mutationFn: (expectedVersion: number) =>
      apiFetch<PostharvestParameters>('/api/postharvest-parameters/reset', {
        method: 'POST',
        body: {
          expected_version: expectedVersion,
          ...(producer && { producer }),
        },
      }),
    onSettled: () => invalidate(),
  });
}
