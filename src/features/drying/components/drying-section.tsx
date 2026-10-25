'use client';

import { Sun } from 'lucide-react';
import { useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { LoadingBlock } from '@/components/loading-block';
import { SectionCard } from '@/components/page-blocks/section-card';
import { Button } from '@/components/ui/button';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNotFound } from '@/lib/api/errors';
import type { LotStatus } from '@/lib/lot-status';
import { notify } from '@/lib/notify';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useDrying } from '../api';
import { logRows } from '../log-rows';
import { useQueuedLogs } from '../use-log-queue';
import { DryingFacts } from './drying-facts';
import { DryingSectionActions } from './drying-section-actions';
import { LogsTable } from './logs-table';
import { StartDryingDialog, type StartLot } from './start-drying-dialog';

export type SectionLot = StartLot & {
  status: LotStatus;
  farm: StartLot['farm'] & { id: string };
};

// Lo que pide un lote Fermentado: empezar. Solo con conexión, porque ocupa una marquesina.
function StartSection({
  lot,
  facilitiesHref,
}: {
  lot: SectionLot;
  facilitiesHref?: string;
}) {
  const online = useHasConnection();
  const [starting, setStarting] = useState(false);
  return (
    <SectionCard accent="cobre" title="Secado">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">
          {online
            ? 'Este lote está listo para secar.'
            : 'Iniciar el secado necesita conexión.'}
        </p>
        <Button
          disabled={!online}
          onClick={() => setStarting(true)}
          size="office"
        >
          <Sun aria-hidden="true" className="size-4" /> Iniciar secado
        </Button>
      </div>
      {starting && (
        <StartDryingDialog
          facilitiesHref={facilitiesHref}
          lot={lot}
          onClose={() => setStarting(false)}
          onSaved={() => {
            setStarting(false);
            notify.success('Secado iniciado');
          }}
        />
      )}
    </SectionCard>
  );
}

// La sección Secado de la ficha de un lote, después de la de fermentación. Un lote Fermentado
// ofrece iniciarlo; uno en secado o más adelante muestra sus datos y sus bitácoras día por día (la
// línea de tiempo del lote). Sin secado que mostrar, no ocupa lugar.
export function DryingSection({
  lot,
  facilitiesHref,
}: {
  lot: SectionLot;
  // La infraestructura de la finca del lote; falta si la cuenta no puede consultarla.
  facilitiesHref?: string;
}) {
  const { data: user } = useSession();
  const online = useHasConnection();
  const canManage = hasPermission(user, PERMISSIONS.DRYING_MANAGE);
  const canLog = hasPermission(user, PERMISSIONS.DRYING_LOG);
  const beforeDrying =
    lot.status === 'generated' || lot.status === 'fermenting';
  const fermented = lot.status === 'fermented';
  const read = useDrying(lot.id, user?.id, {
    enabled: !beforeDrying && !fermented,
  });
  const queued = useQueuedLogs(user?.id);

  if (beforeDrying) return null;
  if (fermented) {
    return canManage ? (
      <StartSection facilitiesHref={facilitiesHref} lot={lot} />
    ) : null;
  }
  if (read.isError && isNotFound(read.error)) return null;

  const body = () => {
    if (read.isPending) {
      return <LoadingBlock label="Cargando el secado" shapes={['h-40']} />;
    }
    if (read.isError) {
      return (
        <ErrorState
          message="No fue posible cargar el secado."
          onRetry={() => void read.refetch()}
        />
      );
    }
    const drying = read.data.data;
    // Con la copia del dispositivo, lo que escribe en línea se deshabilita aunque el navegador
    // diga tener red: el servidor no respondió.
    const writable = online && read.data.savedAt === undefined;
    const inProgress = !drying.result;
    const now = new Date();
    const shownQueue = inProgress ? queued : [];
    return (
      <div className="space-y-4">
        <DryingFacts drying={drying} now={now} queued={shownQueue} />
        {inProgress && (
          <DryingSectionActions
            canLog={canLog}
            canManage={canManage}
            drying={drying}
            facilitiesHref={facilitiesHref}
            lot={lot}
            online={writable}
            queued={queued}
          />
        )}
        <LogsTable
          editable={inProgress && canLog}
          lotId={lot.id}
          online={writable}
          rows={logRows(drying, shownQueue, now)}
        />
      </div>
    );
  };

  return (
    <SectionCard accent="cobre" title="Secado">
      {body()}
    </SectionCard>
  );
}
