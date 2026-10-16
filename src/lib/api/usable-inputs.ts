'use client';

import { useMemo } from 'react';

import { isFarmEmployee } from '@/lib/farm-scope';
import type { CatalogInput } from '@/lib/input-usage';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import {
  useAgriculturalInputs,
  useFarmInputs,
  useInputStocks,
} from './input-catalog';

type UsingAccount = NonNullable<Parameters<typeof isFarmEmployee>[0]> & {
  id: string;
  is_superuser?: boolean;
};

export type UsableInputs = {
  // Los insumos activos que se pueden registrar como gastados, o `undefined` si el catálogo nunca
  // se cargó en este dispositivo.
  catalog: CatalogInput[] | undefined;
  // Las existencias de la finca por insumo, o `undefined` si no hay copia de ellas.
  stocks: ReadonlyMap<string, string> | undefined;
  // Todavía se está leyendo el catálogo (sin red y sin copia no cuenta como "leyendo").
  isPending: boolean;
};

// Los insumos que se ofrecen al registrar lo gastado en una labor de la finca `farmId` (su
// realización o un control fitosanitario hecho), con lo que hay de cada uno en la finca. Un empleado
// elige entre los que hay en esa finca: aunque trabaje en varias, lo que gasta sale de ella. El
// Productor, de su catálogo completo; la cuenta técnica, del catálogo del productor de la labor.
// Cada lectura cae a su copia del dispositivo cuando no hay red.
export function useUsableInputs(
  user: UsingAccount | undefined,
  {
    farmId,
    producerId,
    enabled = true,
  }: { farmId: string | null; producerId: string | null; enabled?: boolean },
): UsableInputs {
  const employee = isFarmEmployee(user);
  const productCatalog = useAgriculturalInputs(
    user?.id,
    user?.is_superuser === true ? producerId : null,
    { enabled: enabled && !employee },
  );
  const farmCatalog = useFarmInputs(user?.id, farmId, {
    enabled: enabled && employee,
  });
  const catalog = employee ? farmCatalog : productCatalog;
  const stocks = useInputStocks(user?.id, farmId);

  const active = useMemo(
    () => catalog.data?.data.filter((input) => input.is_active),
    [catalog.data],
  );
  const stockByInput = useMemo(
    () =>
      stocks.data &&
      new Map(
        stocks.data.data.map((stock) => [stock.input_id, stock.quantity]),
      ),
    [stocks.data],
  );
  return {
    catalog: active,
    stocks: stockByInput,
    isPending: catalog.isPending && !isPausedWithoutData(catalog),
  };
}
