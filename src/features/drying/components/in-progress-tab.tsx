import { EmptyState } from '@/components/empty-state';
import { SunDryingTray } from '@/components/illustrations/sun-drying-tray';
import { Button } from '@/components/ui/button';

import type { Drying } from '../api';
import type { QueuedLog } from '../log-queue';
import { DryingCard } from './drying-card';

// La pestaña En secado, ya filtrada por finca, del lote que empezó primero al más reciente.
export function InProgressTab({
  dryings,
  farmName,
  now,
  queued,
  lotHref,
  onClear,
  onShowReady,
  canManage,
  online,
  finishLotId,
  onFinishHandled,
}: {
  dryings: readonly Drying[];
  // La finca del filtro, si hay una puesta.
  farmName: string | null;
  now: Date;
  queued: readonly QueuedLog[];
  lotHref: (id: string) => string;
  onClear: () => void;
  // Lleva a los lotes listos; falta si no hay ninguno o la cuenta no puede iniciar.
  onShowReady?: () => void;
  canManage: boolean;
  online: boolean;
  // El lote cuyo formulario de finalizar se abre al llegar desde Lotes.
  finishLotId: string | null;
  onFinishHandled: () => void;
}) {
  if (dryings.length === 0 && farmName) {
    return (
      <EmptyState
        action={
          <Button onClick={onClear} size="office" variant="outline">
            Limpiar filtros
          </Button>
        }
        illustration={SunDryingTray}
        title={`Ningún lote en secado en ${farmName}.`}
      />
    );
  }
  if (dryings.length === 0) {
    return (
      <EmptyState
        action={
          onShowReady && (
            <Button onClick={onShowReady} size="office" variant="outline">
              Inicia el secado de un lote.
            </Button>
          )
        }
        illustration={SunDryingTray}
        title="No hay lotes en secado."
      />
    );
  }
  return (
    <ul
      aria-label="Lotes en secado"
      className="motion-stagger grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3"
    >
      {dryings.map((drying) => (
        <DryingCard
          autoFinish={finishLotId === drying.lot.id}
          canManage={canManage}
          drying={drying}
          key={drying.lot.id}
          lotHref={lotHref}
          now={now}
          onAutoFinished={onFinishHandled}
          online={online}
          queued={queued}
        />
      ))}
    </ul>
  );
}
