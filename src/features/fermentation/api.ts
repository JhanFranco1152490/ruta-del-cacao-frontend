import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { apiPath } from '@/lib/api/path';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];

export type Fermentation = Schemas['FermentationProcess'];
export type FermentationTurn = Schemas['FermentationTurn'];
export type ReadyLot = Schemas['Lot'];

export const FERMENTATION_ERROR = {
  duplicateTurnTime: 'duplicate_turn_time',
  notInProgress: 'fermentation_not_in_progress',
  turnIdConflict: 'turn_id_conflict',
  staleVersion: 'stale_version',
  exceedsCapacity: 'lot_exceeds_capacity',
  facilityUnavailable: 'facility_unavailable',
  lotInvalidStatus: 'lot_invalid_status',
  responsibleNotAvailable: 'responsible_not_available',
  hasTurns: 'fermentation_has_turns',
  withoutTurns: 'fermentation_without_turns',
} as const;

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const fermentationsCacheKey = (producer: string | null) =>
  producer ? `fermentation:producer:${producer}` : 'fermentation';

// Las fermentaciones en curso del productor, con sus volteos y el origen de cada lote, sin
// paginar: son pocas, y la finca se filtra en el dispositivo, también sin conexión. Con esta copia
// se abre la ficha de un lote en fermentación sin red. `producer` solo lo envía la cuenta técnica.
export async function fetchFermentations(
  producer: string | null,
  signal?: AbortSignal,
): Promise<Fermentation[]> {
  const { results } = await apiFetch<Schemas['FermentationList']>(
    apiPath('/api/fermentation', { producer }),
    { signal },
  );
  return results;
}

export const useFermentations = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.fermentation.list(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, fermentationsCacheKey(producer), () =>
        fetchFermentations(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// El tope de página que acepta la API.
const READY_PAGE_SIZE = 100;

// Todos los lotes Generado del productor, página tras página: la pestaña los muestra juntos y los
// filtra por finca en el dispositivo. Solo con conexión, porque iniciar también la necesita.
export async function fetchReadyLots(
  producer: string | null,
  signal?: AbortSignal,
): Promise<ReadyLot[]> {
  const lots: ReadyLot[] = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const result = await apiFetch<Schemas['PaginatedLotList']>(
      apiPath('/api/lots', {
        status: 'generated',
        producer,
        page: page === 1 ? undefined : page,
        page_size: READY_PAGE_SIZE,
      }),
      { signal },
    );
    lots.push(...result.results);
    pages = Math.ceil(result.count / READY_PAGE_SIZE);
  }
  return lots;
}

export const useReadyLots = (
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.fermentation.ready(producer),
    queryFn: ({ signal }) => fetchReadyLots(producer, signal),
    enabled,
  });

// La fermentación de un lote, en curso o terminada, para su ficha. Solo con conexión: la ficha sin
// red se arma con la copia de la lista.
export const useFermentation = (lotId: string, { enabled = true } = {}) =>
  useQuery({
    queryKey: queryKeys.fermentation.detail(lotId),
    queryFn: ({ signal }) =>
      apiFetch<Fermentation>(`/api/fermentation/${lotId}`, { signal }),
    enabled,
  });

// El `id` lo genera el dispositivo: un reenvío desde la cola devuelve el volteo ya guardado en vez
// de registrarlo dos veces.
export const postTurn = (
  lotId: string,
  body: Schemas['FermentationTurnCreateRequest'],
) =>
  apiFetch<FermentationTurn>(`/api/fermentation/${lotId}/turns`, {
    method: 'POST',
    body,
  });

type TurnUpdateRequest = Schemas['PatchedFermentationTurnUpdateRequest'];

export const patchTurn = (
  lotId: string,
  turnId: string,
  body: TurnUpdateRequest,
) =>
  apiFetch<FermentationTurn>(`/api/fermentation/${lotId}/turns/${turnId}`, {
    method: 'PATCH',
    body,
  });

// Corregir un volteo del servidor es solo en línea: sin red falla en el acto, en vez de quedar en
// pausa y aplicarse solo al volver la red, cuando ya nadie lo está pidiendo. Al terminar se vuelve
// a leer la lista, que también renueva su copia.
export function useUpdateTurn(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      turnId,
      body,
    }: {
      turnId: string;
      body: TurnUpdateRequest;
    }) => patchTurn(lotId, turnId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.fermentation.all() }),
  });
}

// Los cajones disponibles de la finca del lote y quién puede responder, para iniciar o corregir el
// inicio. Solo con conexión: quien decide si un cajón sigue libre es el servidor.
export const useStartOptions = (lotId: string) =>
  useQuery({
    queryKey: queryKeys.fermentation.startOptions(lotId),
    queryFn: ({ signal }) =>
      apiFetch<Schemas['StartOptions']>(
        apiPath('/api/fermentation/start-options', { lot: lotId }),
        { signal },
      ),
  });

// Iniciar, corregir el inicio y finalizar ocupan o liberan un cajón y cambian el estado del lote: al
// terminar se vuelven a leer la fermentación y los lotes. Solo en línea, como corregir un volteo.
function useInvalidateAfterProcessChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.fermentation.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
    ]);
}

export function useStartFermentation() {
  const invalidate = useInvalidateAfterProcessChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['FermentationStartRequest']) =>
      apiFetch<Fermentation>('/api/fermentation', { method: 'POST', body }),
    onSuccess: () => invalidate(),
  });
}

export function useCorrectStart(lotId: string) {
  const invalidate = useInvalidateAfterProcessChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['PatchedFermentationStartUpdateRequest']) =>
      apiFetch<Fermentation>(`/api/fermentation/${lotId}`, {
        method: 'PATCH',
        body,
      }),
    onSuccess: () => invalidate(),
  });
}

// Finalizar libera el cajón y deja el lote Fermentado: al terminar se vuelven a leer la
// fermentación y los lotes. Solo en línea.
export function useFinishFermentation(lotId: string) {
  const invalidate = useInvalidateAfterProcessChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['FermentationFinishRequest']) =>
      apiFetch<Fermentation>(`/api/fermentation/${lotId}/finish`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => invalidate(),
  });
}
