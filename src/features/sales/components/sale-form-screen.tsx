'use client';

import { Breadcrumb } from '@/components/breadcrumb';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';

import { OFFLINE_SALES_REASON } from '../sale-messages';
import { SALES_PATH } from '../sale-paths';
import { useSaleFormScreen } from '../use-sale-form-screen';
import { SaleForm } from './sale-form';

// Registrar una venta: una página y no un diálogo, porque lleva una lista de líneas. Solo con
// conexión: vender depende de lo que hay en bodega en ese momento.
export function SaleFormScreen() {
  const screen = useSaleFormScreen();

  if (!screen.online) {
    return (
      <PageNotice
        description="Cuando vuelva la conexión, abre de nuevo esta pantalla."
        illustration={OfflineCloud}
        title={OFFLINE_SALES_REASON}
      />
    );
  }

  return (
    <div className={pageContainerClass('narrow', 'space-y-6')}>
      <Breadcrumb
        items={[
          { label: 'Ventas', href: screen.returnPath || SALES_PATH },
          { label: 'Registrar venta' },
        ]}
      />
      <PageHeader eyebrow="Comercialización" title="Registrar venta" />
      <SaleFormBody screen={screen} />
    </div>
  );
}

function SaleFormBody({
  screen,
}: {
  screen: ReturnType<typeof useSaleFormScreen>;
}) {
  const { farms } = screen;
  if (screen.needsProducer) {
    // El productor se elige en el formulario: sin él, la finca y el comprador esperan.
    return <SaleForm key="sin-productor" screen={screen} />;
  }
  if (farms.isPending) {
    return <LoadingBlock label="Cargando las fincas" shapes={['h-64']} />;
  }
  if (!farms.data) {
    return (
      <ErrorState
        message="No fue posible cargar las fincas."
        onRetry={() => void farms.refetch()}
      />
    );
  }
  if (screen.farmOptions.length === 0) {
    return (
      <PageNotice title="No hay fincas activas donde registrar una venta." />
    );
  }
  // Otro productor, otras fincas y otros compradores: el formulario empieza de nuevo.
  return <SaleForm key={screen.producer ?? 'propio'} screen={screen} />;
}
