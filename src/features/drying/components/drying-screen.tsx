'use client';

import { useState } from 'react';

import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { PageHeader } from '@/components/page-header';
import { ProcessToolbar } from '@/components/process-toolbar';
import { ProducerFilter } from '@/components/producer-filter';
import { useStartFromLink } from '@/hooks/use-start-from-link';

import type { ReadyLot } from '../api';
import { countMissingToday } from '../drying-list';
import { useDryingScreen } from '../use-drying-screen';
import { DryingBody } from './drying-body';
import { DryingSummary } from './drying-summary';
import { StartReadyLot } from './start-ready-lot';

const DRYING_VIEW_OPTIONS = [
  { value: 'en-secado', label: 'En secado' },
  { value: 'listos', label: 'Listos para secar' },
] as const;

// Secado: el trabajo del día de quien seca. La ficha del lote es de otro dominio: su ruta la
// entrega quien monta la pantalla.
export function DryingScreen({
  lotHref,
  facilitiesHref,
}: {
  lotHref: (id: string) => string;
  // La infraestructura de una finca, para cuando no hay marquesinas libres al iniciar.
  facilitiesHref: (farmId: string) => string;
}) {
  const [starting, setStarting] = useState<ReadyLot>();
  const screen = useDryingScreen();
  const { filters, read } = screen;
  const now = new Date();
  useStartFromLink({
    lotId: filters.startLotId,
    readyLots: screen.ready.data,
    missingMessage: 'Este lote ya no está listo para secar.',
    onFound: setStarting,
    onDone: filters.clearStart,
  });

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        tone="selva"
        accent="cobre"
        description="Los lotes que se secan en tus marquesinas, qué bitácora falta hoy y los que están listos para empezar."
        eyebrow="Poscosecha"
        title="Secado"
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
        <DryingSummary
          inProgress={screen.shown.length}
          missingToday={countMissingToday(screen.shown, now, screen.queued)}
          ready={screen.readyShown?.length}
        />
      )}
      {!screen.needsProducer && (
        <ProcessToolbar
          farm={screen.farm.choice}
          farmOptions={screen.farmOptions}
          onFarm={(farm) => void filters.setFarm(farm)}
          onView={
            screen.canManage ? (next) => void filters.setView(next) : undefined
          }
          view={screen.view}
          viewLabel="Vista de secado"
          views={DRYING_VIEW_OPTIONS}
        />
      )}
      {read.isSuccess && screen.offline && (
        <OfflineCopyNotice
          consequence="Iniciar o finalizar un secado necesita conexión."
          savedAt={read.data.savedAt}
        />
      )}
      <DryingBody
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
