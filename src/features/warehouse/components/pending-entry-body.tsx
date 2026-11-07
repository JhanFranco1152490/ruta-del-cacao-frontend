'use client';

import { EmptyState } from '@/components/empty-state';
import { WarehouseShelves } from '@/components/illustrations/warehouse-shelves';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';

import type { DialogRequest } from '../dialog-request';
import type { WarehouseScreenState } from '../use-warehouse-screen';
import { pendingEntryOffer } from '../warehouse-actions';
import { PendingEntryCard } from './pending-entry-card';
import { WAREHOUSE_PAGE_SIZE } from './stock-body';
import { WarehouseListGate } from './warehouse-list-gate';

// La pestaña Por ingresar: los lotes Clasificado, del que se clasificó primero al último. Solo la
// ve quien puede ingresarlos.
export function PendingEntryBody({
  screen,
  lotHref,
  onAction,
}: {
  screen: WarehouseScreenState;
  lotHref: (id: string) => string;
  onAction: (request: DialogRequest) => void;
}) {
  const { filters } = screen;
  const entryOffer = pendingEntryOffer(!screen.offline, screen.can);
  const filtered =
    !!filters.pendingFilters.farm || !!filters.pendingFilters.search;
  return (
    <WarehouseListGate
      errorMessage="No fue posible cargar los lotes por ingresar."
      loadingLabel="Cargando lotes por ingresar"
      needsProducer={screen.needsProducer}
      query={screen.pending}
    >
      {(page) => {
        if (page.results.length === 0) {
          return filtered ? (
            <EmptyState
              action={
                <Button
                  onClick={() => void filters.clear()}
                  size="office"
                  variant="outline"
                >
                  Limpiar filtros
                </Button>
              }
              illustration={WarehouseShelves}
              title="Ningún lote por ingresar coincide con los filtros."
            />
          ) : (
            <EmptyState
              illustration={WarehouseShelves}
              title="No hay lotes clasificados por ingresar a bodega."
            />
          );
        }
        return (
          <>
            <ul
              aria-label="Lotes por ingresar"
              className="motion-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
            >
              {page.results.map((lot) => (
                <PendingEntryCard
                  entryOffer={entryOffer}
                  key={lot.lot.id}
                  lot={lot}
                  lotHref={screen.can.viewLot ? lotHref : null}
                  onAction={onAction}
                />
              ))}
            </ul>
            {!screen.offline && (
              <Pagination
                label="lotes"
                onPageChange={(next) => void filters.setPage(next)}
                page={filters.pendingFilters.page}
                pageSize={WAREHOUSE_PAGE_SIZE}
                total={page.count}
              />
            )}
          </>
        );
      }}
    </WarehouseListGate>
  );
}
