'use client';

import { Thermometer } from 'lucide-react';
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

import { useFermentation } from '../api';
import { turnRows } from '../turn-rows';
import { useQueuedTurns } from '../use-turn-queue';
import { FermentationFacts } from './fermentation-facts';
import { FermentationSectionActions } from './fermentation-section-actions';
import {
  StartFermentationDialog,
  type StartLot,
} from './start-fermentation-dialog';
import { TurnsTable } from './turns-table';

export type SectionLot = StartLot & {
  status: LotStatus;
  farm: StartLot['farm'] & { id: string };
};

// Lo que pide un lote Generado: empezar. Solo con conexión, porque ocupa un cajón.
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
    <SectionCard accent="cobre" title="Fermentación">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">
          {online
            ? 'Este lote está listo para fermentar.'
            : 'Iniciar la fermentación necesita conexión.'}
        </p>
        <Button
          disabled={!online}
          onClick={() => setStarting(true)}
          size="office"
        >
          <Thermometer aria-hidden="true" className="size-4" /> Iniciar
          fermentación
        </Button>
      </div>
      {starting && (
        <StartFermentationDialog
          facilitiesHref={facilitiesHref}
          lot={lot}
          onClose={() => setStarting(false)}
          onSaved={() => {
            setStarting(false);
            notify.success('Fermentación iniciada');
          }}
        />
      )}
    </SectionCard>
  );
}

// La sección Fermentación de la ficha de un lote, antes de la de secado. Un lote Generado ofrece
// iniciarla; uno en fermentación o más adelante muestra sus datos y sus volteos (la línea de
// tiempo del lote). Sin fermentación que mostrar, no ocupa lugar.
export function FermentationSection({
  lot,
  facilitiesHref,
}: {
  lot: SectionLot;
  // La infraestructura de la finca del lote; falta si la cuenta no puede consultarla.
  facilitiesHref?: string;
}) {
  const { data: user } = useSession();
  const online = useHasConnection();
  const canManage = hasPermission(user, PERMISSIONS.FERMENTATION_MANAGE);
  const canLogTurns = hasPermission(user, PERMISSIONS.FERMENTATION_LOG_TURNS);
  const generated = lot.status === 'generated';
  const read = useFermentation(lot.id, user?.id, { enabled: !generated });
  const queued = useQueuedTurns(user?.id);

  if (generated) {
    return canManage ? (
      <StartSection facilitiesHref={facilitiesHref} lot={lot} />
    ) : null;
  }
  if (read.isError && isNotFound(read.error)) return null;

  const body = () => {
    if (read.isPending) {
      return (
        <LoadingBlock label="Cargando la fermentación" shapes={['h-40']} />
      );
    }
    if (read.isError) {
      return (
        <ErrorState
          message="No fue posible cargar la fermentación."
          onRetry={() => void read.refetch()}
        />
      );
    }
    const fermentation = read.data.data;
    // Con la copia del dispositivo, lo que escribe en línea se deshabilita aunque el navegador
    // diga tener red: el servidor no respondió.
    const writable = online && read.data.savedAt === undefined;
    const inProgress = !fermentation.result;
    const rows = turnRows(fermentation, inProgress ? queued : []);
    return (
      <div className="space-y-4">
        <FermentationFacts
          fermentation={fermentation}
          now={new Date()}
          queued={inProgress ? queued : []}
        />
        {inProgress && (
          <FermentationSectionActions
            canLogTurns={canLogTurns}
            canManage={canManage}
            facilitiesHref={facilitiesHref}
            fermentation={fermentation}
            lot={lot}
            online={writable}
            queued={queued}
          />
        )}
        {rows.length === 0 ? (
          <p className="text-muted-foreground">Sin volteos todavía.</p>
        ) : (
          <TurnsTable
            editable={inProgress && canLogTurns}
            lotId={lot.id}
            online={writable}
            rows={rows}
          />
        )}
      </div>
    );
  };

  return (
    <SectionCard accent="cobre" title="Fermentación">
      {body()}
    </SectionCard>
  );
}
