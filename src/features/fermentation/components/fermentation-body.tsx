'use client';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { isNeverLoaded } from '@/lib/offline/paused-read';

import type { ReadyLot } from '../api';
import type { FermentationScreenState } from '../use-fermentation-screen';
import { InProgressTab } from './in-progress-tab';
import { ReadyLotsTab } from './ready-lots-tab';

const NEEDS_CONNECTION =
  'Necesitas conexión una vez para cargar los lotes en fermentación.';

// La pestaña elegida de Fermentación, o el estado que la reemplaza mientras no hay qué mostrar.
export function FermentationBody({
  screen,
  now,
  lotHref,
  onStart,
}: {
  screen: FermentationScreenState;
  now: Date;
  lotHref: (id: string) => string;
  onStart: (lot: ReadyLot) => void;
}) {
  const { filters, read, ready, readyShown } = screen;

  if (screen.needsProducer) {
    return (
      <p className="text-muted-foreground">
        Elige un productor para ver sus lotes en fermentación.
      </p>
    );
  }
  if (screen.view === 'listos') {
    return (
      <ReadyLotsTab
        farmName={screen.farm.name}
        isError={ready.isError}
        isPending={ready.isPending}
        lots={readyShown ?? []}
        offline={screen.offline}
        onClear={filters.clear}
        onRetry={() => void ready.refetch()}
        onStart={onStart}
      />
    );
  }
  if (isNeverLoaded(read)) {
    return <EmptyState illustration={OfflineCloud} title={NEEDS_CONNECTION} />;
  }
  if (read.isPending) {
    return <LoadingBlock label="Cargando fermentaciones" shapes={['h-40']} />;
  }
  if (!read.data) {
    return (
      <ErrorState
        message="No fue posible cargar los lotes en fermentación."
        onRetry={() => void read.refetch()}
      />
    );
  }
  return (
    <InProgressTab
      farmName={screen.farm.name}
      fermentations={screen.shown}
      lotHref={lotHref}
      now={now}
      onClear={filters.clear}
      queued={screen.queued}
      onShowReady={
        readyShown?.length ? () => void filters.setView('listos') : undefined
      }
    />
  );
}
