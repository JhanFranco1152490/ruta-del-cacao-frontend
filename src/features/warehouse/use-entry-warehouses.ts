'use client';

import { useSession } from '@/hooks/use-session';

import type { StockEntry } from './api';
import { useWarehouses } from './queries';

// Las bodegas donde puede quedar el ingreso de un lote: las activas de su finca. Al corregir, la
// bodega actual se ofrece aunque ya esté desactivada: quedarse en ella no es un ingreso nuevo.
export function useEntryWarehouses(farmId: string, entry: StockEntry | null) {
  const { data: user } = useSession();
  const warehouses = useWarehouses(user?.id, {
    producer: null,
    farm: farmId,
    active: true,
    page: 1,
  });
  const active = warehouses.data?.data.results ?? [];
  const keepsCurrent =
    entry && !active.some(({ id }) => id === entry.warehouse.id);
  return {
    options: keepsCurrent
      ? [
          ...active,
          {
            id: entry.warehouse.id,
            name: `${entry.warehouse.name} (inactiva)`,
          },
        ]
      : active,
    // Con una sola donde ingresar, queda elegida.
    onlyId: !entry && active.length === 1 ? active[0].id : null,
    // Sin ninguna activa no hay a dónde ingresar.
    none: !entry && warehouses.isSuccess && active.length === 0,
  };
}
