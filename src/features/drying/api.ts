import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { fetchLotsByStatus } from '@/lib/api/lots-by-status';
import { apiPath } from '@/lib/api/path';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';
import { readWithPostharvestCopy } from '@/lib/offline/postharvest-copies';

type Schemas = components['schemas'];

export type Drying = Schemas['DryingProcess'];
export type DryingLog = Schemas['DryingLog'];
// La bitácora recién registrada o corregida, con los desvíos que cumple.
export type SavedLog = Schemas['DryingLogSaved'];
export type DryingResult = Schemas['DryingResult'];
export type StartOptions = Schemas['DryingStartOptions'];
export type Weather = Schemas['DryingWeatherEnum'];
export type ReadyLot = Schemas['Lot'];

export const DRYING_ERROR = {
  duplicateLogDate: 'duplicate_drying_log_date',
  notInProgress: 'drying_not_in_progress',
  logIdConflict: 'drying_log_id_conflict',
  staleVersion: 'stale_version',
  entryMoistureOutOfRange: 'entry_moisture_out_of_range',
  facilityUnavailable: 'facility_unavailable',
  lotInvalidStatus: 'lot_invalid_status',
  responsibleNotAvailable: 'responsible_not_available',
  hasLogs: 'drying_has_logs',
  withoutLogs: 'drying_without_logs',
} as const;

// La cuenta técnica guarda aparte lo de cada productor que eligió.
export const dryingsCacheKey = (producer: string | null) =>
  producer ? `drying:producer:${producer}` : 'drying';

// Los secados en curso del productor, con sus bitácoras y el origen de cada lote, sin paginar: son
// pocos, y la finca se filtra en el dispositivo, también sin conexión. Con esta copia se abre la
// ficha de un lote en secado sin red. `producer` solo lo envía la cuenta técnica.
export async function fetchDryings(
  producer: string | null,
  signal?: AbortSignal,
): Promise<Drying[]> {
  const { results } = await apiFetch<Schemas['DryingList']>(
    apiPath('/api/drying', { producer }),
    { signal },
  );
  return results;
}

export const useDryings = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.drying.list(producer),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, dryingsCacheKey(producer), () =>
        fetchDryings(producer, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// Los lotes Fermentado del productor, todos: la pestaña los filtra por finca en el dispositivo. Solo
// con conexión, porque iniciar también la necesita.
export const useReadyLots = (
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.drying.ready(producer),
    queryFn: ({ signal }) => fetchLotsByStatus('fermented', producer, signal),
    enabled,
  });

// El secado de un lote, en curso o terminado, para su ficha. Sin conexión, el de un lote en secado
// se toma de la copia de la lista (la misma con la que se arma la ficha del lote).
export const useDrying = (
  lotId: string,
  userId: string | undefined,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.drying.detail(lotId),
    queryFn: ({ signal }) =>
      readWithPostharvestCopy(
        userId!,
        lotId,
        () => apiFetch<Drying>(`/api/drying/${lotId}`, { signal }),
        (copied) => copied.process as Drying,
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// El `id` lo genera el dispositivo: un reenvío desde la cola devuelve la bitácora ya guardada en
// vez de registrarla dos veces.
export const postLog = (
  lotId: string,
  body: Schemas['DryingLogCreateRequest'],
) => apiFetch<SavedLog>(`/api/drying/${lotId}/logs`, { method: 'POST', body });

type LogUpdateRequest = Schemas['PatchedDryingLogUpdateRequest'];

export const patchLog = (
  lotId: string,
  logId: string,
  body: LogUpdateRequest,
) =>
  apiFetch<SavedLog>(`/api/drying/${lotId}/logs/${logId}`, {
    method: 'PATCH',
    body,
  });

// Corregir una bitácora del servidor es solo en línea: sin red falla en el acto, en vez de quedar
// en pausa y aplicarse solo al volver la red, cuando ya nadie lo está pidiendo. Al terminar se
// vuelve a leer la lista, que también renueva su copia.
export function useUpdateLog(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ logId, body }: { logId: string; body: LogUpdateRequest }) =>
      patchLog(lotId, logId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.drying.all() }),
  });
}

// La versión leída va en la URL: un DELETE con cuerpo no tiene significado definido en HTTP. Solo
// en línea, como corregir.
export function useDeleteLog(lotId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({ logId, version }: { logId: string; version: number }) =>
      apiFetch<void>(
        apiPath(`/api/drying/${lotId}/logs/${logId}`, {
          expected_version: version,
        }),
        { method: 'DELETE' },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.drying.all() }),
  });
}

// Las marquesinas disponibles de la finca del lote y quién puede responder, para iniciar o corregir
// el inicio. Solo con conexión: quien decide si una marquesina sigue libre es el servidor.
export const useStartOptions = (lotId: string) =>
  useQuery({
    queryKey: queryKeys.drying.startOptions(lotId),
    queryFn: ({ signal }) =>
      apiFetch<StartOptions>(
        apiPath('/api/drying/start-options', { lot: lotId }),
        { signal },
      ),
  });

// Iniciar, corregir el inicio y finalizar ocupan o liberan una marquesina y cambian el estado del
// lote: al terminar se vuelven a leer el secado y los lotes. Solo en línea, como corregir.
function useInvalidateAfterProcessChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.drying.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
    ]);
}

export function useStartDrying() {
  const invalidate = useInvalidateAfterProcessChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['DryingStartRequest']) =>
      apiFetch<Drying>('/api/drying', { method: 'POST', body }),
    onSuccess: () => invalidate(),
  });
}

export function useCorrectStart(lotId: string) {
  const invalidate = useInvalidateAfterProcessChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['PatchedDryingStartUpdateRequest']) =>
      apiFetch<Drying>(`/api/drying/${lotId}`, { method: 'PATCH', body }),
    onSuccess: () => invalidate(),
  });
}

// Finalizar libera la marquesina y deja el lote Seco: al terminar se vuelven a leer el secado y los
// lotes. Solo en línea.
export function useFinishDrying(lotId: string) {
  const invalidate = useInvalidateAfterProcessChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: (body: Schemas['DryingFinishRequest']) =>
      apiFetch<Drying>(`/api/drying/${lotId}/finish`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => invalidate(),
  });
}
