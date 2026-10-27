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
import { apiPath } from '@/lib/api/path';
import {
  type CopiedProcess,
  readWithPostharvestCopy,
} from '@/lib/offline/postharvest-copies';

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

const listPath = (query: LotQuery) =>
  apiPath('/api/lots', { ...query, page_size: LOT_PAGE_SIZE });

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

export type LotStatusTotal = Schemas['LotStatusTotal'];
// El recuento sigue a los filtros de la lista menos el estado (lo que se elige con él) y la página.
export type LotSummaryQuery = Omit<LotQuery, 'status' | 'page'>;

// Cuántos lotes y kilos hay en cada estado. Como la lista, solo con conexión.
export const useLotSummary = (query: LotSummaryQuery) =>
  useQuery({
    queryKey: queryKeys.lots.summary(query),
    queryFn: async ({ signal }) => {
      const { results } = await apiFetch<Schemas['LotSummary']>(
        apiPath('/api/lots/summary', query),
        { signal },
      );
      return results;
    },
    placeholderData: keepPreviousData,
  });

// El lote como lo guarda la copia de una lista de poscosecha: con su origen y su proceso, pero sin
// el código de socio del productor ni quién lo conformó y cuándo. Esos quedan vacíos y la ficha
// sin conexión no los muestra. De un lote en secado la copia no trae su fermentación.
export function lotFromCopy(copied: CopiedProcess): Lot {
  const { lot } = copied.process;
  return {
    id: lot.id,
    code: lot.code,
    status: lot.status,
    harvest: lot.harvest,
    producer: { id: lot.harvest.producer_id, member_code: '' },
    green_weight_kg: lot.green_weight_kg,
    created_by: null,
    version: 0,
    created_at: '',
    updated_at: '',
    fermentation:
      copied.kind === 'fermentation'
        ? {
            started_at: copied.process.started_at,
            ended_at: copied.process.result?.ended_at ?? null,
            facility: copied.process.facility.name,
          }
        : null,
    drying:
      copied.kind === 'drying'
        ? {
            started_at: copied.process.started_at,
            ended_at: copied.process.result?.ended_at ?? null,
            facility: copied.process.facility.name,
            final_moisture_pct:
              copied.process.result?.final_moisture_pct ?? null,
            dry_weight_kg: copied.process.result?.dry_weight_kg ?? null,
            yield_pct: copied.process.result?.yield_pct ?? null,
          }
        : null,
  };
}

// La ficha de un lote se lee con conexión; sin ella, la de un lote que está en una copia de
// poscosecha (en fermentación) se arma con esa copia.
export const useLot = (id: string, userId: string | undefined) =>
  useQuery({
    queryKey: queryKeys.lots.detail(id),
    queryFn: ({ signal }) =>
      readWithPostharvestCopy(
        userId!,
        id,
        () => apiFetch<Lot>(`/api/lots/${id}`, { signal }),
        lotFromCopy,
      ),
    enabled: !!id && !!userId,
    networkMode: 'offlineFirst',
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
