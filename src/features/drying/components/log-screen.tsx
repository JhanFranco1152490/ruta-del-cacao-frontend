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

import { DRYING_PATH } from '../drying-paths';
import { useLogDrying } from '../use-log-drying';
import { useQueuedLog, useQueuedLogs } from '../use-log-queue';
import { LogCapture } from './log-capture';

const Loading = () => (
  <LoadingBlock
    className={pageContainerClass('narrow', 'space-y-6')}
    label="Cargando el secado"
    shapes={['h-12 w-2/3', 'h-96']}
  />
);

// La pantalla de campo de la bitácora de un lote. Registrar guarda primero en el dispositivo: con
// conexión se envía de inmediato y, sin ella, cuando vuelva. `pendingId` llega al corregir desde la
// bandeja lo que el servidor rechazó; `logId`, al corregir en línea una bitácora del servidor. La
// ficha del lote es de otro dominio: su ruta la da quien monta la pantalla.
export function LogScreen({
  lotId,
  pendingId,
  logId,
  lotHref,
}: {
  lotId: string;
  pendingId?: string;
  logId?: string;
  lotHref: (id: string) => string;
}) {
  const { data: user } = useSession();
  const state = useLogDrying(lotId);
  const queued = useQueuedLogs(user?.id);
  const pending = useQueuedLog(pendingId ?? '');
  const sync = useCaptureSyncStatus('bitácoras');
  const { returnPath, finish } = useFinishSave(DRYING_PATH);

  switch (state.kind) {
    case 'loading':
      return <Loading />;
    case 'unreachable':
      return (
        <PageNotice
          description="Abre Secado una vez con conexión y tus lotes en secado quedarán guardados para registrar bitácoras sin conexión."
          illustration={OfflineCloud}
          title="Necesitas conexión una vez para cargar los lotes en secado."
        />
      );
    case 'missing':
      return <PageNotice title="Este lote no está en secado." />;
    case 'finished':
      return <PageNotice title="El secado de este lote ya se finalizó." />;
    case 'error':
      return (
        <ErrorState
          message="No fue posible cargar el secado."
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
        title="Esta bitácora ya no está pendiente."
      />
    );
  }
  if (rejected && rejected.status !== 'error') {
    return (
      <PageNotice
        description="Está en los registros del dispositivo y se enviará al servidor."
        title="Esta bitácora ya está guardada."
      />
    );
  }
  const { drying } = state;
  const serverLog = logId
    ? drying.logs.find(({ id }) => id === logId)
    : undefined;
  if (logId && !serverLog) {
    return <PageNotice title="Esta bitácora ya no existe." />;
  }

  const correcting = !!rejected || !!serverLog;
  return (
    <div className={pageContainerClass('narrow', 'space-y-6')}>
      <Breadcrumb
        items={[
          { label: 'Secado', href: DRYING_PATH },
          { label: correcting ? 'Corregir bitácora' : 'Registrar bitácora' },
        ]}
      />
      <LogCapture
        drying={drying}
        finish={finish}
        logsHref={lotHref(lotId)}
        queued={queued}
        rejected={rejected}
        returnPath={returnPath}
        serverLog={serverLog}
        sync={sync}
      />
    </div>
  );
}
