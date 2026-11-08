import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

import type { Buyer, BuyerCreateRequest, BuyerUpdateRequest } from './api';

export const postBuyer = (body: BuyerCreateRequest) =>
  apiFetch<Buyer>('/api/buyers', { method: 'POST', body });

export const patchBuyer = (id: string, body: BuyerUpdateRequest) =>
  apiFetch<Buyer>(`/api/buyers/${id}`, { method: 'PATCH', body });

// La versión leída va en la URL: un DELETE con cuerpo no tiene significado definido en HTTP.
export const deleteBuyer = (id: string, expectedVersion: number) => {
  const params = new URLSearchParams({
    expected_version: String(expectedVersion),
  });
  return apiFetch<void>(`/api/buyers/${id}?${params}`, { method: 'DELETE' });
};

// Volver a leer la lista también renueva su copia en el dispositivo.
function useInvalidateBuyers() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.buyers.all() });
}

// Las escrituras son solo en línea: sin red fallan en el acto, en vez de quedar en pausa y
// ejecutarse solas al volver la red, cuando ya nadie las está pidiendo.
export function useCreateBuyer() {
  const invalidate = useInvalidateBuyers();
  return useMutation({
    networkMode: 'always',
    mutationFn: postBuyer,
    onSuccess: () => invalidate(),
  });
}

// Editar, activar y desactivar. También al fallar: con una versión obsoleta, el siguiente intento
// debe leer la vigente.
export function useUpdateBuyer() {
  const invalidate = useInvalidateBuyers();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ id, body }: { id: string; body: BuyerUpdateRequest }) =>
      patchBuyer(id, body),
    onSettled: () => invalidate(),
  });
}

export function useDeleteBuyer() {
  const invalidate = useInvalidateBuyers();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => deleteBuyer(id, expectedVersion),
    onSettled: () => invalidate(),
  });
}
