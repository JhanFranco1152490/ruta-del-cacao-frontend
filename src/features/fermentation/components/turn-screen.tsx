'use client';

import { Breadcrumb } from '@/components/breadcrumb';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { pageContainerClass } from '@/components/page-container';
import { PageNotice } from '@/components/page-notice';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';

import { FERMENTATION_PATH } from '../fermentation-paths';
import { useTurnFermentation } from '../use-turn-fermentation';
import { useQueuedTurn, useQueuedTurns } from '../use-turn-queue';
import { TurnCapture } from './turn-capture';

const Loading = () => (
  <LoadingBlock
    className={pageContainerClass('narrow', 'space-y-6')}
    label="Cargando la fermentación"
    shapes={['h-12 w-2/3', 'h-96']}
  />
);

// La pantalla de campo del volteo de un lote. Registrar guarda primero en el dispositivo: con
// conexión se envía de inmediato y, sin ella, cuando vuelva. `pendingId` llega al corregir desde la
// bandeja lo que el servidor rechazó; `turnId`, al corregir en línea un volteo del servidor. La
// ficha del lote es de otro dominio: su ruta la da quien monta la pantalla.
export function TurnScreen({
  lotId,
  pendingId,
  turnId,
  lotHref,
}: {
  lotId: string;
  pendingId?: string;
  turnId?: string;
  lotHref: (id: string) => string;
}) {
  const { data: user } = useSession();
  const state = useTurnFermentation(lotId);
  const queued = useQueuedTurns(user?.id);
  const pending = useQueuedTurn(pendingId ?? '');
  const sync = useCaptureSyncStatus('volteos');
  const { returnPath, finish } = useFinishSave(FERMENTATION_PATH);

  switch (state.kind) {
    case 'loading':
      return <Loading />;
    case 'unreachable':
      return (
        <PageNotice
          description="Abre Fermentación una vez con conexión y tus lotes en fermentación quedarán guardados para registrar volteos sin conexión."
          illustration={OfflineCloud}
          title="Necesitas conexión una vez para cargar los lotes en fermentación."
        />
      );
    case 'missing':
      return <PageNotice title="Este lote no está en fermentación." />;
    case 'finished':
      return (
        <PageNotice title="La fermentación de este lote ya se finalizó." />
      );
    case 'error':
      return (
        <ErrorState
          message="No fue posible cargar la fermentación."
          onRetry={state.retry}
        />
      );
  }

  if (pendingId && pending.isPending) return <Loading />;
  const rejected = pendingId ? (pending.data ?? undefined) : undefined;
  if (pendingId && (!rejected || rejected.lotId !== lotId)) {
    return (
      <PageNotice
        description="Ya no está en los registros de este dispositivo: se envió o se descartó."
        title="Este volteo ya no está pendiente."
      />
    );
  }
  if (rejected && rejected.status !== 'error') {
    return (
      <PageNotice
        description="Está en los registros del dispositivo y se enviará al servidor."
        title="Este volteo ya está guardado."
      />
    );
  }
  const { fermentation } = state;
  const serverTurn = turnId
    ? fermentation.turns.find(({ id }) => id === turnId)
    : undefined;
  if (turnId && !serverTurn) {
    return <PageNotice title="Este volteo ya no existe." />;
  }

  const correcting = !!rejected || !!serverTurn;
  return (
    <div className={pageContainerClass('narrow', 'space-y-6')}>
      <Breadcrumb
        items={[
          { label: 'Fermentación', href: FERMENTATION_PATH },
          { label: correcting ? 'Corregir volteo' : 'Registrar volteo' },
        ]}
      />
      <TurnCapture
        fermentation={fermentation}
        finish={finish}
        queued={queued}
        rejected={rejected}
        returnPath={returnPath}
        serverTurn={serverTurn}
        sync={sync}
        turnsHref={lotHref(lotId)}
      />
    </div>
  );
}
