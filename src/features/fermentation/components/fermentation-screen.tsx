'use client';

import { useState } from 'react';

import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { ProducerFilter } from '@/components/producer-filter';

import type { ReadyLot } from '../api';
import { countOverdue } from '../fermentation-list';
import { useFermentationScreen } from '../use-fermentation-screen';
import { FermentationBody } from './fermentation-body';
import { FermentationSummary } from './fermentation-summary';
import { FermentationToolbar } from './fermentation-toolbar';
import { StartReadyLot } from './start-ready-lot';

// Fermentación: el trabajo del día de quien fermenta. La ficha del lote es de otro dominio: su ruta
// la entrega quien monta la pantalla.
export function FermentationScreen({
  lotHref,
  facilitiesHref,
}: {
  lotHref: (id: string) => string;
  // La infraestructura de una finca, para cuando no hay cajones libres al iniciar.
  facilitiesHref: (farmId: string) => string;
}) {
  const [starting, setStarting] = useState<ReadyLot>();
  const screen = useFermentationScreen();
  const { filters, read } = screen;
  const now = new Date();

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        tone="selva"
        accent="cobre"
        description="Los lotes que fermentan en tus cajones, cuándo toca su próximo volteo y los que están listos para empezar."
        eyebrow="Poscosecha"
        title="Fermentación"
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
      {read.data && (
        <FermentationSummary
          inProgress={screen.shown.length}
          overdue={countOverdue(screen.shown, now, screen.queued)}
          ready={screen.readyShown?.length}
        />
      )}
      {!screen.needsProducer && (
        <FermentationToolbar
          farm={screen.farm.choice}
          farmOptions={screen.farmOptions}
          onFarm={(farm) => void filters.setFarm(farm)}
          onView={
            screen.canManage ? (next) => void filters.setView(next) : undefined
          }
          view={screen.view}
        />
      )}
      {read.isSuccess && screen.offline && (
        <OfflineCopyNotice
          consequence="Iniciar o finalizar una fermentación necesita conexión."
          savedAt={read.data.savedAt}
        />
      )}
      <FermentationBody
        lotHref={lotHref}
        now={now}
        onStart={setStarting}
        screen={screen}
      />
      {starting && (
        <StartReadyLot
          facilitiesHref={screen.canSeeFacilities ? facilitiesHref : undefined}
          lot={starting}
          lotHref={lotHref}
          onClose={() => setStarting(undefined)}
        />
      )}
    </div>
  );
}
