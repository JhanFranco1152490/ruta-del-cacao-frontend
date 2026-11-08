'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { notify } from '@/lib/notify';

import type { Buyer } from '../api';
import { buyerActions } from '../buyer-actions';
import { buyerCountText } from '../buyer-format';
import { BUYER_NEEDS_CONNECTION } from '../buyer-messages';
import { useBuyersScreen } from '../use-buyers-screen';
import { BuyerDialogs, type PendingBuyerAction } from './buyer-dialogs';
import { BuyerFiltersBar } from './buyer-filters-bar';
import { BuyerListStates } from './buyer-list-states';
import { BuyerRowActions } from './buyer-row-actions';
import { BuyerSheet } from './buyer-sheet';
import { BuyerSheetActions } from './buyer-sheet-actions';
import { BuyerSummaryStrip } from './buyer-summary-strip';
import { BuyerTable } from './buyer-table';

// El directorio de compradores del productor: se consulta también sin conexión, con la copia del
// dispositivo, y se registra y cambia solo en línea.
export function BuyersScreen() {
  const screen = useBuyersScreen();
  const { filters, read, rows, selected, offline, savedAt, permissions } =
    screen;
  const isDesktop = useIsDesktop();
  const [pending, setPending] = useState<PendingBuyerAction>();
  const actionsOf = (buyer: Buyer) =>
    buyerActions(buyer, permissions, !offline);

  const register = screen.canAdd && (
    <Button
      disabled={offline}
      onClick={() => setPending({ kind: 'create' })}
      size="office"
      title={offline ? BUYER_NEEDS_CONNECTION : undefined}
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar comprador
    </Button>
  );

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        tone="claro"
        accent="cobre"
        actions={read.isSuccess ? register : undefined}
        description="A quienes les vendes el cacao, con su documento y cómo contactarlos, para elegirlos al registrar una venta."
        eyebrow="Comercialización"
        title="Compradores"
      />
      {read.isSuccess && <BuyerSummaryStrip summary={screen.summary} />}
      {read.isSuccess && offline && (
        <OfflineCopyNotice
          consequence={BUYER_NEEDS_CONNECTION}
          savedAt={savedAt}
        />
      )}
      <section className="space-y-5 rounded-lg bg-card p-5 shadow-card">
        <BuyerFiltersBar
          filters={filters.filters}
          onClear={filters.clear}
          onProducer={screen.superuser ? filters.setProducer : undefined}
          onSearch={filters.setSearch}
          onStatus={filters.setStatus}
          onType={filters.setType}
          producer={screen.producer}
        />
        <BuyerListStates register={register} screen={screen}>
          <p className="text-sm font-bold text-muted-foreground">
            {buyerCountText(rows.length)} · ordenados por nombre
          </p>
          <BuyerTable
            buyers={rows}
            onSelect={(id) => filters.showBuyer(id)}
            renderActions={(buyer) => {
              const { actions, inMenu } = actionsOf(buyer);
              return (
                <BuyerRowActions
                  actions={actions}
                  inMenu={inMenu}
                  name={buyer.name}
                  onAction={(kind) => setPending({ kind, buyer })}
                />
              );
            }}
            selectedId={filters.buyer}
            showProducer={screen.showProducer}
          />
        </BuyerListStates>
      </section>
      {/* La hoja queda abierta debajo del diálogo de la acción que se elija en ella. */}
      {selected && !isDesktop && (
        <BuyerSheet
          actions={
            <BuyerSheetActions
              actions={actionsOf(selected).actions}
              onAction={(kind) => setPending({ kind, buyer: selected })}
            />
          }
          buyer={selected}
          onClose={() => filters.showBuyer(null)}
          showProducer={screen.showProducer}
        />
      )}
      <BuyerDialogs
        chooseProducer={screen.superuser}
        known={screen.all}
        onClose={() => setPending(undefined)}
        onSaved={(message) => {
          setPending(undefined);
          if (message) notify.success(message);
        }}
        onShowExisting={(id) => {
          setPending(undefined);
          filters.revealBuyer(id);
        }}
        pending={pending}
        producer={screen.producer}
      />
    </div>
  );
}
