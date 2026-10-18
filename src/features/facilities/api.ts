import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];

export type PostharvestFacility = Schemas['PostharvestFacility'];
export type FacilityCreateRequest = Schemas['PostharvestFacilityCreateRequest'];
export type FacilityUpdateRequest =
  Schemas['PatchedPostharvestFacilityUpdateRequest'];

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

export const postFacility = (body: FacilityCreateRequest) =>
  apiFetch<PostharvestFacility>('/api/postharvest-facilities', {
    method: 'POST',
    body,
  });

export const patchFacility = (id: string, body: FacilityUpdateRequest) =>
  apiFetch<PostharvestFacility>(`/api/postharvest-facilities/${id}`, {
    method: 'PATCH',
    body,
  });

// Volver a leer la lista también renueva su copia en el dispositivo.
function useInvalidateFacilities() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.facilities.all() });
}

// Las escrituras son solo en línea: sin red fallan en el acto, en vez de quedar en pausa y
// ejecutarse solas al volver la red, cuando ya nadie las está pidiendo.
export function useCreateFacility() {
  const invalidate = useInvalidateFacilities();
  return useMutation({
    networkMode: 'always',
    mutationFn: postFacility,
    onSuccess: () => invalidate(),
  });
}

// También al fallar: con una versión obsoleta, el siguiente intento debe leer la vigente.
export function useUpdateFacility() {
  const invalidate = useInvalidateFacilities();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, body }: { id: string; body: FacilityUpdateRequest }) =>
      patchFacility(id, body),
    onSettled: () => invalidate(),
  });
}
