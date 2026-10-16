import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { isApiError } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/query-keys';
import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];
export type Lot = Schemas['Lot'];

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
