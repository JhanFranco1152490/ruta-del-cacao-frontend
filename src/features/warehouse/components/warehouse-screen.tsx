'use client';

import { useState } from 'react';

import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { ProducerFilter } from '@/components/producer-filter';

import type { DialogRequest } from '../dialog-request';
import { useRequestFromLink } from '../use-request-from-link';
import { useWarehouseScreen } from '../use-warehouse-screen';
import { OFFLINE_WAREHOUSE_REASON } from '../warehouse-actions';
import { PendingEntryBody } from './pending-entry-body';
import { StockBody } from './stock-body';
import { WarehouseActionDialog } from './warehouse-action-dialog';
import { WarehouseFiltersBar } from './warehouse-filters-bar';
import { WarehouseSummary } from './warehouse-summary';
import { WarehousesBody } from './warehouses-body';

// Bodega: el cacao seco que hay de cada calibre, los lotes clasificados por ingresar y las bodegas
// de cada finca. La ficha del lote es de otro dominio: su ruta la entrega quien monta la pantalla.
export function WarehouseScreen({
  lotHref,
}: {
  lotHref: (id: string) => string;
}) {
  const screen = useWarehouseScreen();
  const { filters } = screen;
  const [request, setRequest] = useState<DialogRequest>();
  useRequestFromLink({
    pending: filters.pendingAction,
    online: !screen.offline,
    onRequest: setRequest,
    onDone: filters.clearAction,
  });

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        accent="cobre"
        description="Ingresa los lotes clasificados, consulta cuánto hay de cada calibre y registra lo que sale."
        eyebrow="Poscosecha"
        title="Bodega"
        tone="selva"
      />
      {screen.superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          producer={screen.producer ?? undefined}
          selected={screen.selectedProducer}
        />
      )}
      {!screen.needsProducer && (
        <>
          <WarehouseSummary summary={screen.summary.data?.data} />
          <WarehouseFiltersBar screen={screen} />
        </>
      )}
      {screen.listLoaded && screen.offline && (
        <OfflineCopyNotice
          consequence={OFFLINE_WAREHOUSE_REASON}
          savedAt={screen.savedAt}
        />
      )}
      {screen.view === 'existencias' && (
        <StockBody lotHref={lotHref} onAction={setRequest} screen={screen} />
      )}
      {screen.view === 'por-ingresar' && (
        <PendingEntryBody
          lotHref={lotHref}
          onAction={setRequest}
          screen={screen}
        />
      )}
      {screen.view === 'bodegas' && <WarehousesBody screen={screen} />}
      {request && (
        <WarehouseActionDialog
          onClose={() => setRequest(undefined)}
          request={request}
        />
      )}
    </div>
  );
}
