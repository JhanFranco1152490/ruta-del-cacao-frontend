'use client';

import { EmptyState } from '@/components/empty-state';
import { WarehouseShelves } from '@/components/illustrations/warehouse-shelves';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';

import type { WarehouseScreenState } from '../use-warehouse-screen';
import { ExitTable } from './exit-table';
import { WAREHOUSE_PAGE_SIZE } from './stock-body';
import { WarehouseListGate } from './warehouse-list-gate';

// La pestaña Salidas: la tabla con su paginación, o el vacío que corresponde. Solo se consulta;
// anular una salida se hace desde la ficha del lote.
export function ExitBody({
  screen,
  lotHref,
}: {
  screen: WarehouseScreenState;
  lotHref: (id: string) => string;
}) {
  const { filters } = screen;
  return (
    <WarehouseListGate
      errorMessage="No fue posible cargar las salidas."
      loadingLabel="Cargando salidas"
      needsProducer={screen.needsProducer}
      query={screen.exits}
    >
      {(page) =>
        page.results.length === 0 ? (
          filters.hasFilters ? (
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
              title="No hay salidas para este filtro."
            />
          ) : (
            <EmptyState
              illustration={WarehouseShelves}
              title="Todavía no ha salido cacao de la bodega."
            />
          )
        ) : (
          <>
            <ExitTable
              lotHref={screen.can.viewLot ? lotHref : null}
              rows={page.results}
            />
            {!screen.offline && (
              <Pagination
                label="salidas"
                onPageChange={(next) => void filters.setPage(next)}
                page={filters.exitFilters.page}
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
