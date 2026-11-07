'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { WarehouseShelves } from '@/components/illustrations/warehouse-shelves';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import type { Warehouse } from '../api';
import type { WarehouseScreenState } from '../use-warehouse-screen';
import {
  OFFLINE_WAREHOUSE_REASON,
  type WarehouseItemAction,
  warehouseItemActions,
} from '../warehouse-actions';
import { WAREHOUSE_PAGE_SIZE } from './stock-body';
import { WarehouseCard } from './warehouse-card';
import {
  type WarehouseChange,
  WarehouseConfirmDialog,
} from './warehouse-confirm-dialog';
import { WarehouseFormDialog } from './warehouse-form-dialog';
import { WarehouseListGate } from './warehouse-list-gate';

type OpenDialog =
  | { kind: 'form'; warehouse?: Warehouse }
  | { kind: 'confirm'; warehouse: Warehouse; change: WarehouseChange };

// La pestaña Bodegas: las de las fincas de la cuenta (o de la finca elegida), con lo que se puede
// hacer con cada una. Quien solo consulta ve la lista sin acciones.
export function WarehousesBody({ screen }: { screen: WarehouseScreenState }) {
  const { filters, can } = screen;
  const online = !screen.offline;
  const [open, setOpen] = useState<OpenDialog>();
  const close = () => setOpen(undefined);
  const done = (message: string) => {
    close();
    notify.success(message);
  };
  const onAction = (warehouse: Warehouse, action: WarehouseItemAction) =>
    setOpen(
      action === 'editar'
        ? { kind: 'form', warehouse }
        : { kind: 'confirm', warehouse, change: action },
    );
  const create = can.manage && (
    <Button
      disabled={!online}
      onClick={() => setOpen({ kind: 'form' })}
      size="office"
      title={online ? undefined : OFFLINE_WAREHOUSE_REASON}
    >
      <Plus aria-hidden="true" className="size-4" />
      Nueva bodega
    </Button>
  );
  // Con una finca elegida (o una sola), el vacío habla de ella.
  const oneFarm =
    !!filters.warehouseFilters.farm || screen.farmOptions.length === 1;

  return (
    <>
      <WarehouseListGate
        errorMessage="No fue posible cargar las bodegas."
        loadingLabel="Cargando bodegas"
        needsProducer={screen.needsProducer}
        query={screen.warehouses}
      >
        {(page) =>
          page.results.length === 0 ? (
            <EmptyState
              action={create || undefined}
              illustration={WarehouseShelves}
              title={
                oneFarm
                  ? 'Esta finca todavía no tiene bodegas.'
                  : 'Todavía no hay bodegas registradas.'
              }
            />
          ) : (
            <div className="space-y-4">
              {create && <div className="flex justify-end">{create}</div>}
              <ul
                aria-label="Bodegas"
                className="motion-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
              >
                {page.results.map((warehouse) => (
                  <WarehouseCard
                    key={warehouse.id}
                    offers={warehouseItemActions(warehouse, online, can)}
                    onAction={onAction}
                    warehouse={warehouse}
                  />
                ))}
              </ul>
              {online && (
                <Pagination
                  label="bodegas"
                  onPageChange={(next) => void filters.setPage(next)}
                  page={filters.warehouseFilters.page}
                  pageSize={WAREHOUSE_PAGE_SIZE}
                  total={page.count}
                />
              )}
            </div>
          )
        }
      </WarehouseListGate>
      {open?.kind === 'form' && (
        <WarehouseFormDialog
          farmId={filters.warehouseFilters.farm}
          farms={screen.activeFarmOptions}
          onClose={close}
          onSaved={done}
          warehouse={open.warehouse}
        />
      )}
      {open?.kind === 'confirm' && (
        <WarehouseConfirmDialog
          change={open.change}
          onClose={close}
          onDone={done}
          warehouse={open.warehouse}
        />
      )}
    </>
  );
}
