'use client';

import { EmptyState } from '@/components/empty-state';
import { WarehouseShelves } from '@/components/illustrations/warehouse-shelves';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';

import type { DialogRequest } from '../dialog-request';
import type { StockOrdering } from '../use-warehouse-filters';
import type { WarehouseScreenState } from '../use-warehouse-screen';
import { stockExitOffer, stockMoveOffer } from '../warehouse-actions';
import { StockTable } from './stock-table';
import { WarehouseListGate } from './warehouse-list-gate';

// El tamaño de página del servidor.
export const WAREHOUSE_PAGE_SIZE = 20;

// La pestaña Existencias: la tabla con su paginación, o el vacío que corresponde.
export function StockBody({
  screen,
  lotHref,
  onAction,
}: {
  screen: WarehouseScreenState;
  lotHref: (id: string) => string;
  onAction: (request: DialogRequest) => void;
}) {
  const { filters } = screen;
  const exitOffer = stockExitOffer(!screen.offline, screen.can);
  const moveOffer = stockMoveOffer(!screen.offline, screen.can);
  return (
    <WarehouseListGate
      errorMessage="No fue posible cargar las existencias."
      loadingLabel="Cargando existencias"
      needsProducer={screen.needsProducer}
      query={screen.stock}
    >
      {(page) =>
        page.results.length === 0 ? (
          <StockEmpty
            filtered={filters.hasFilters}
            onClear={() => void filters.clear()}
          />
        ) : (
          <>
            <StockTable
              exitOffer={exitOffer}
              lotHref={screen.can.viewLot ? lotHref : null}
              moveOffer={moveOffer}
              onAction={onAction}
              onSort={(next) => void filters.setOrdering(next as StockOrdering)}
              ordering={screen.ordering}
              rows={page.results}
            />
            {!screen.offline && (
              <Pagination
                label="existencias"
                onPageChange={(next) => void filters.setPage(next)}
                page={filters.stockFilters.page}
                pageSize={WAREHOUSE_PAGE_SIZE}
                total={page.count}
              />
            )}
          </>
        )
      }
    </WarehouseListGate>
  );
}

function StockEmpty({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  if (!filtered) {
    return (
      <EmptyState
        illustration={WarehouseShelves}
        title="Todavía no hay cacao en bodega."
      />
    );
  }
  return (
    <EmptyState
      action={
        <Button onClick={onClear} size="office" variant="outline">
          Limpiar filtros
        </Button>
      }
      illustration={WarehouseShelves}
      title="No hay existencias para este filtro."
    />
  );
}
