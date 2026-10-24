import { EmptyState } from '@/components/empty-state';
import { FermentationBox } from '@/components/illustrations/fermentation-box';
import { Button } from '@/components/ui/button';

import type { Fermentation } from '../api';
import type { QueuedTurn } from '../turn-queue';
import { FermentationCard } from './fermentation-card';

// La pestaña En fermentación, ya filtrada por finca, del lote que empezó primero al más reciente.
export function InProgressTab({
  fermentations,
  farmName,
  now,
  queued,
  lotHref,
  onClear,
  onShowReady,
  canManage,
  online,
}: {
  fermentations: readonly Fermentation[];
  // La finca del filtro, si hay una puesta.
  farmName: string | null;
  now: Date;
  queued: readonly QueuedTurn[];
  lotHref: (id: string) => string;
  onClear: () => void;
  // Lleva a los lotes listos; falta si no hay ninguno o la cuenta no puede iniciar.
  onShowReady?: () => void;
  canManage: boolean;
  online: boolean;
}) {
  if (fermentations.length === 0 && farmName) {
    return (
      <EmptyState
        action={
          <Button onClick={onClear} size="office" variant="outline">
            Limpiar filtros
          </Button>
        }
        illustration={FermentationBox}
        title={`Ningún lote en fermentación en ${farmName}.`}
      />
    );
  }
  if (fermentations.length === 0) {
    return (
      <EmptyState
        action={
          onShowReady && (
            <Button onClick={onShowReady} size="office" variant="outline">
              Inicia la fermentación de un lote.
            </Button>
          )
        }
        illustration={FermentationBox}
        title="No hay lotes en fermentación."
      />
    );
  }
  return (
    <ul
      aria-label="Lotes en fermentación"
      className="motion-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
    >
      {fermentations.map((fermentation) => (
        <FermentationCard
          canManage={canManage}
          fermentation={fermentation}
          key={fermentation.lot.id}
          lotHref={lotHref}
          now={now}
          online={online}
          queued={queued}
        />
      ))}
    </ul>
  );
}
