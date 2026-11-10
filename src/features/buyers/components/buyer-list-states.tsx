import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BuyerScale } from '@/components/illustrations/buyer-scale';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { Button } from '@/components/ui/button';

import type { BuyersScreenState } from '../use-buyers-screen';

// Lo que va en lugar de la tabla mientras el directorio carga, si nunca se cargó, si falló o si
// está vacío; `children` (la tabla) cuando hay filas.
export function BuyerListStates({
  screen,
  register,
  children,
}: {
  screen: BuyersScreenState;
  register: ReactNode;
  children: ReactNode;
}) {
  const { read, all, rows, neverLoaded, filters } = screen;
  if (neverLoaded) {
    return (
      <EmptyState
        description="Cuando tengas conexión, abre esta pantalla una vez y quedarán guardados para consultarlos sin conexión."
        illustration={OfflineCloud}
        title="Necesitas conexión una vez para cargar los compradores."
      />
    );
  }
  if (read.isPending) {
    return <LoadingBlock label="Cargando compradores" shapes={['h-64']} />;
  }
  if (read.isError) {
    return (
      <ErrorState
        message="No fue posible cargar los compradores."
        onRetry={() => void read.refetch()}
      />
    );
  }
  if (all.length === 0) {
    return (
      <EmptyState
        action={register}
        description="Registra a quienes te compran el cacao para elegirlos al registrar una venta."
        illustration={BuyerScale}
        title="Aún no hay compradores registrados"
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        action={
          <Button onClick={filters.clear} size="office" variant="outline">
            Limpiar filtros
          </Button>
        }
        description="Prueba con otro nombre o documento, o cambia los filtros."
        illustration={BuyerScale}
        title="No se encontraron compradores"
      />
    );
  }
  return children;
}
