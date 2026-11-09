import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

import type {
  EntryCorrection,
  EntryInput,
  ExitInput,
  ExitVoidInput,
  LotStock,
  MoveInput,
  Warehouse,
  WarehouseInput,
  WarehouseUpdate,
} from './api';

// Cualquier escritura de bodega cambia a la vez las existencias, los totales, lo que queda por
// ingresar y el lote (su estado y su campo `warehouse`): se vuelven a leer Bodega y Lotes, y con
// ellos sus copias en el dispositivo.
function useInvalidateAfterWarehouseChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
    ]);
}

// Todo se registra con conexión: nada de bodega pasa por la cola.
function useWarehouseWrite<TBody, TResult>(
  write: (body: TBody) => Promise<TResult>,
) {
  const invalidate = useInvalidateAfterWarehouseChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: write,
    onSuccess: () => invalidate(),
  });
}

const warehousePath = (id: string) =>
  `/api/warehouses/${encodeURIComponent(id)}`;

const stockPath = (lotId: string, rest = '') =>
  `/api/stock/${encodeURIComponent(lotId)}${rest}`;

export const useCreateWarehouse = () =>
  useWarehouseWrite((body: WarehouseInput) =>
    apiFetch<Warehouse>('/api/warehouses', { method: 'POST', body }),
  );

// Cambia el nombre, o activa y desactiva.
export const useUpdateWarehouse = (id: string) =>
  useWarehouseWrite((body: WarehouseUpdate) =>
    apiFetch<Warehouse>(warehousePath(id), { method: 'PATCH', body }),
  );

// La versión va en la dirección: un DELETE no lleva cuerpo.
export const useDeleteWarehouse = (id: string) =>
  useWarehouseWrite((expectedVersion: number) =>
    apiFetch<void>(
      `${warehousePath(id)}?${new URLSearchParams({
        expected_version: String(expectedVersion),
      })}`,
      { method: 'DELETE' },
    ),
  );

export const useRegisterEntry = (lotId: string) =>
  useWarehouseWrite((body: EntryInput) =>
    apiFetch<LotStock>(stockPath(lotId, '/entry'), { method: 'POST', body }),
  );

export const useCorrectEntry = (lotId: string) =>
  useWarehouseWrite((body: EntryCorrection) =>
    apiFetch<LotStock>(stockPath(lotId, '/entry'), { method: 'PATCH', body }),
  );

export const useRegisterExit = (lotId: string) =>
  useWarehouseWrite((body: ExitInput) =>
    apiFetch<LotStock>(stockPath(lotId, '/exits'), { method: 'POST', body }),
  );

export const useVoidExit = (lotId: string) =>
  useWarehouseWrite(({ exitId, ...body }: ExitVoidInput & { exitId: string }) =>
    apiFetch<LotStock>(
      stockPath(lotId, `/exits/${encodeURIComponent(exitId)}/void`),
      { method: 'POST', body },
    ),
  );

export const useMoveStock = (lotId: string) =>
  useWarehouseWrite((body: MoveInput) =>
    apiFetch<LotStock>(stockPath(lotId, '/move'), { method: 'POST', body }),
  );
