import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { SaleReceipt } from '@/components/illustrations/sale-receipt';
import { LoadingBlock } from '@/components/loading-block';
import { NeverLoadedState } from '@/components/never-loaded-state';
import { Button } from '@/components/ui/button';
import { formatMonthYear } from '@/lib/format/dates';

import type { SalesScreenState } from '../use-sales-screen';

// Lo que va en lugar de la tabla mientras no hay qué mostrar: falta elegir el productor, nunca se
// cargó y no hay conexión, se está cargando, falló o no hay ventas; `children` (la tabla) cuando
// las hay.
export function SaleListStates({
  screen,
  register,
  children,
}: {
  screen: SalesScreenState;
  register: ReactNode;
  children: ReactNode;
}) {
  const { sales, rows, filters } = screen;
  if (screen.needsProducer) {
    return (
      <p className="text-muted-foreground">
        Elige un productor para ver sus ventas.
      </p>
    );
  }
  if (screen.neverLoaded) {
    return (
      <NeverLoadedState
        description="Cuando tengas conexión, abre esta pantalla una vez y quedarán guardadas para consultarlas sin conexión."
        subject="las ventas"
      />
    );
  }
  if (sales.isPending) {
    return <LoadingBlock label="Cargando ventas" shapes={['h-64']} />;
  }
  if (!sales.data) {
    return (
      <ErrorState
        message="No fue posible cargar las ventas."
        onRetry={() => void sales.refetch()}
      />
    );
  }
  if (rows.length > 0) return children;
  if (filters.hasFilters) {
    return (
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
        description="Prueba con otro número o comprador, o cambia los filtros."
        illustration={SaleReceipt}
        title="No se encontraron ventas."
      />
    );
  }
  return (
    <EmptyState
      action={register}
      illustration={SaleReceipt}
      title={`No hay ventas registradas en ${formatMonthYear(filters.period.month)}.`}
    />
  );
}
