import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components, operations } from '@/lib/api/schema';

type Schemas = components['schemas'];
export type Lot = Schemas['Lot'];
export type LotPage = Schemas['PaginatedLotList'];
export type LotQuery = Omit<
  NonNullable<operations['lots_list']['parameters']['query']>,
  'page_size'
>;
type LotDeleteQuery = operations['lots_destroy']['parameters']['query'];

export const LOT_PAGE_SIZE = 20;

export const LOT_ERROR = {
  harvestAlreadyInLot: 'harvest_already_in_lot',
  idConflict: 'lot_id_conflict',
  invalidStatus: 'lot_invalid_status',
  staleVersion: 'stale_version',
} as const;

// El `id` lo genera el dispositivo: un reintento sobre la misma cosecha devuelve el lote ya creado
// en vez de crear otro.
export const postLot = (body: Schemas['LotCreateRequest']) =>
  apiFetch<Lot>('/api/lots', { method: 'POST', body });

// El lote que ya forma la cosecha, cuando otra persona lo conformó primero.
export function existingLotOf(error: unknown): Lot | null {
  if (!isApiError(error) || error.code !== LOT_ERROR.harvestAlreadyInLot) {
    return null;
  }
  return (error.body.current as Lot | undefined) ?? null;
}

// Conformar es solo en línea: el código lo asigna el servidor y no existe uno provisional. Sin red
// falla en el acto. Al terminar, bien o mal, las cosechas muestran su lote y la lista de lotes
// se vuelve a leer.
export function useCreateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['LotCreateRequest']) => postLot(body),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.harvests.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
      ]),
  });
}

function listPath(query: LotQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  params.set('page_size', String(LOT_PAGE_SIZE));
  return `/api/lots?${params}`;
}

export const fetchLots = (query: LotQuery, signal?: AbortSignal) =>
  apiFetch<LotPage>(listPath(query), { signal });

// Los lotes son de oficina: solo con conexión y sin copia en el dispositivo. Al cambiar de página
// o de filtro se sigue viendo la anterior mientras llega la nueva.
export const useLots = (query: LotQuery) =>
  useQuery({
    queryKey: queryKeys.lots.list(query),
    queryFn: ({ signal }) => fetchLots(query, signal),
    placeholderData: keepPreviousData,
  });

export const useLot = (id: string) =>
  useQuery({
    queryKey: queryKeys.lots.detail(id),
    queryFn: ({ signal }) => apiFetch<Lot>(`/api/lots/${id}`, { signal }),
    enabled: !!id,
  });

// La versión leída va en la URL: un DELETE con cuerpo no tiene significado definido en HTTP.
export const deleteLot = (id: string, expectedVersion: number) => {
  const query: LotDeleteQuery = { expected_version: expectedVersion };
  const params = new URLSearchParams({
    expected_version: String(query.expected_version),
  });
  return apiFetch<void>(`/api/lots/${id}?${params}`, { method: 'DELETE' });
};

// Eliminar un lote deja su cosecha sin lote: también se vuelven a leer las cosechas.
export function useDeleteLot() {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => deleteLot(id, expectedVersion),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.harvests.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
      ]),
  });
}
