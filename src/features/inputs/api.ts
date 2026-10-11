import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import {
  type AgriculturalInput,
  fetchAgriculturalInputs,
  fetchInputStocks,
  type InputStock,
  useAgriculturalInputs,
  useInputStocks,
} from '@/lib/api/input-catalog';
import type { components, operations } from '@/lib/api/schema';
import { readThroughCache } from '@/lib/offline/cached-read';

type Schemas = components['schemas'];
// El catálogo y las existencias de una finca los leen también otros dominios: viven en `lib/api`.
export {
  type AgriculturalInput,
  fetchAgriculturalInputs,
  fetchInputStocks,
  type InputStock,
  useAgriculturalInputs,
  useInputStocks,
};
export type AgriculturalInputCreateRequest =
  Schemas['AgriculturalInputCreateRequest'];
export type AgriculturalInputUpdateRequest =
  Schemas['PatchedAgriculturalInputUpdateRequest'];
export type ExistingInput = Schemas['ExistingInput'];
export type InputMovement = Schemas['InputMovement'];
export type InputMovementCreateRequest = Schemas['InputMovementCreateRequest'];
export type InputMovementResult = Schemas['InputMovementResult'];
type InputDeleteQuery =
  operations['agricultural_inputs_destroy']['parameters']['query'];

export const INPUT_ERROR = {
  duplicate: 'duplicate_input',
  hasRecords: 'input_has_records',
  unitLocked: 'input_unit_locked',
  inputInactive: 'input_inactive',
  farmInactive: 'farm_inactive',
  producerInactive: 'producer_inactive',
  movementIdConflict: 'movement_id_conflict',
  staleVersion: 'stale_version',
} as const;

// El insumo que ya tiene ese nombre y tipo, para ofrecer verlo o activarlo.
export function duplicateInputOf(error: unknown): ExistingInput | null {
  if (!isApiError(error) || error.code !== INPUT_ERROR.duplicate) return null;
  return (error.body.existing as ExistingInput | undefined) ?? null;
}

// El insumo como está ahora en el servidor, cuando otra persona lo cambió primero.
export function currentInputOf(error: unknown): AgriculturalInput | null {
  if (!isApiError(error) || error.code !== INPUT_ERROR.staleVersion) {
    return null;
  }
  return (error.body.current as AgriculturalInput | undefined) ?? null;
}

// Las existencias de todas las fincas, para ver el total de cada insumo sin elegir una.
export const useInputStockTotals = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.inputStocks.totals(producer),
    queryFn: ({ signal }) =>
      readThroughCache(
        userId!,
        producer ? `input-stocks:totals:${producer}` : 'input-stocks:totals',
        () => fetchInputStocks({ farm: null, producer }, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

export const MOVEMENTS_PAGE_SIZE = 20;

export const fetchInputMovements = (
  inputId: string,
  farmId: string,
  page: number,
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams({
    input: inputId,
    farm: farmId,
    page: String(page),
    page_size: String(MOVEMENTS_PAGE_SIZE),
  });
  return apiFetch<Schemas['PaginatedInputMovementList']>(
    `/api/input-movements?${params}`,
    { signal },
  );
};

// Sin copia en el dispositivo: sin conexión la consulta queda en pausa y la pantalla lo dice.
// Siempre se pide de nuevo al abrir, porque una actividad sincronizada pudo agregar una salida.
export const useInputMovements = (inputId: string, farmId: string) =>
  useInfiniteQuery({
    queryKey: queryKeys.inputMovements.list(inputId, farmId),
    queryFn: ({ pageParam, signal }) =>
      fetchInputMovements(inputId, farmId, pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      last.next ? pages.length + 1 : undefined,
    staleTime: 0,
  });

export const postAgriculturalInput = (body: AgriculturalInputCreateRequest) =>
  apiFetch<AgriculturalInput>('/api/agricultural-inputs', {
    method: 'POST',
    body,
  });

export const patchAgriculturalInput = (
  id: string,
  body: AgriculturalInputUpdateRequest,
) =>
  apiFetch<AgriculturalInput>(`/api/agricultural-inputs/${id}`, {
    method: 'PATCH',
    body,
  });

// La versión leída va en la URL: un DELETE con cuerpo no tiene significado definido en HTTP.
export const deleteAgriculturalInput = (
  id: string,
  expectedVersion: number,
) => {
  const query: InputDeleteQuery = { expected_version: expectedVersion };
  const params = new URLSearchParams({
    expected_version: String(query.expected_version),
  });
  return apiFetch<void>(`/api/agricultural-inputs/${id}?${params}`, {
    method: 'DELETE',
  });
};

export const postInputMovement = (body: InputMovementCreateRequest) =>
  apiFetch<InputMovementResult>('/api/input-movements', {
    method: 'POST',
    body,
  });

function useInvalidateCatalog() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agriculturalInputs.all(),
    });
}

// Las escrituras son solo en línea: sin red deben fallar en el acto con un aviso, y no quedar en
// pausa para ejecutarse solas al volver la red, cuando ya nadie lo está pidiendo.
export function useCreateAgriculturalInput() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    networkMode: 'always',
    mutationFn: postAgriculturalInput,
    onSuccess: () => invalidate(),
  });
}

// También al fallar: con una versión obsoleta, el siguiente intento debe leer la vigente.
export function useUpdateAgriculturalInput() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AgriculturalInputUpdateRequest;
    }) => patchAgriculturalInput(id, body),
    onSettled: () => invalidate(),
  });
}

export function useDeleteAgriculturalInput() {
  const invalidate = useInvalidateCatalog();
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      id,
      expectedVersion,
    }: {
      id: string;
      expectedVersion: number;
    }) => deleteAgriculturalInput(id, expectedVersion),
    onSettled: () => invalidate(),
  });
}

export function useCreateInputMovement() {
  const queryClient = useQueryClient();
  const invalidateCatalog = useInvalidateCatalog();
  return useMutation({
    networkMode: 'always',
    mutationFn: postInputMovement,
    onSuccess: (_, { input_id, farm_id }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.inputStocks.byFarm(farm_id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.inputMovements.list(input_id, farm_id),
      });
      // El primer movimiento marca el insumo con registros: deja de poder eliminarse y su unidad
      // queda fija.
      void invalidateCatalog();
    },
  });
}
