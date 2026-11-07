'use client';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { useProducerSummary } from '@/lib/api/producer-options';
import { resolveFarmFilter } from '@/lib/farm-filter';
import { farmLabel } from '@/lib/format/place-label';

import {
  usePendingEntry,
  useStock,
  useStockSummary,
  useWarehouses,
} from './queries';
import { useWarehouseFilters } from './use-warehouse-filters';
import { warehousePermissionsOf, warehouseViews } from './warehouse-actions';

export type WarehouseScreenState = ReturnType<typeof useWarehouseScreen>;

// El orden de las existencias cuando la dirección no pide otro: lo último que entró, primero.
export const DEFAULT_STOCK_ORDERING = '-entry_date';

// Todo lo que Bodega lee y decide antes de dibujarse. Las listas y los totales se leen también sin
// conexión, con la copia del dispositivo; registrar necesita conexión.
export function useWarehouseScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const can = warehousePermissionsOf(user);
  const filters = useWarehouseFilters(can);
  const superuser = user?.is_superuser === true;
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? filters.stockFilters.producer : null;
  const needsProducer = superuser && !producer;
  const userId = needsProducer ? undefined : user?.id;
  const view = filters.view;

  // Cada pestaña lee solo lo suyo; los totales siguen a las existencias en todas.
  const stock = useStock(
    view === 'existencias' ? userId : undefined,
    filters.stockFilters,
  );
  const summary = useStockSummary(userId, filters.summaryFilters);
  const pending = usePendingEntry(
    userId,
    filters.pendingFilters,
    view === 'por-ingresar' && can.entry,
  );
  // Las bodegas dan las opciones del filtro de bodega (las de la finca elegida, o todas).
  const warehouses = useWarehouses(userId, filters.warehouseFilters);
  const farms = useFarmOptions(user?.id, producer ?? undefined, {
    enabled: !needsProducer,
  });
  const selectedProducer = useProducerSummary(producer ?? undefined);

  const farmList = farms.data?.data.options ?? [];
  const toOption = (farm: (typeof farmList)[number]) => ({
    id: farm.id,
    label: farmLabel(farm),
    name: farm.name,
  });
  const farmOptions = farmList.map(toOption);
  // Donde se puede registrar una bodega: una finca inactiva no la recibe.
  const activeFarmOptions = farmList
    .filter((farm) => farm.isActive)
    .map(toOption);
  const warehouseOptions = (warehouses.data?.data.results ?? []).map(
    (warehouse) => ({
      id: warehouse.id,
      label:
        farmOptions.length > 1
          ? `${warehouse.name} · ${warehouse.farm.name}`
          : warehouse.name,
    }),
  );
  // La lista de la pestaña: de ella sale si lo que se ve es la copia.
  const list = {
    existencias: stock,
    'por-ingresar': pending,
    bodegas: warehouses,
  }[view];
  const savedAt = list.data?.savedAt;

  return {
    filters,
    view,
    views: warehouseViews(can),
    superuser,
    producer,
    selectedProducer,
    needsProducer,
    stock,
    summary,
    pending,
    warehouses,
    offline: !hasConnection || savedAt !== undefined,
    // Hay algo que mostrar en la pestaña: el aviso de la copia solo va sobre una lista.
    listLoaded: list.isSuccess,
    savedAt,
    can,
    farmOptions,
    activeFarmOptions,
    farm: resolveFarmFilter(farmOptions, filters.stockFilters.farm),
    warehouseOptions,
    ordering: filters.stockFilters.ordering ?? DEFAULT_STOCK_ORDERING,
  };
}
