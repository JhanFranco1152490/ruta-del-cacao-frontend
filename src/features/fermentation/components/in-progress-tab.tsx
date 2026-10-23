import { EmptyState } from '@/components/empty-state';
import { DryingShed } from '@/components/illustrations/drying-shed';
import { Button } from '@/components/ui/button';

import type { Fermentation } from '../api';
import { FermentationCard } from './fermentation-card';

// La pestaña En fermentación, ya filtrada por finca, del lote que empezó primero al más reciente.
export function InProgressTab({
  fermentations,
  farmName,
  now,
  lotHref,
  onClear,
  onShowReady,
}: {
  fermentations: readonly Fermentation[];
  // La finca del filtro, si hay una puesta.
  farmName: string | null;
  now: Date;
  lotHref: (id: string) => string;
  onClear: () => void;
  // Lleva a los lotes listos; falta si no hay ninguno o la cuenta no puede iniciar.
  onShowReady?: () => void;
}) {
  if (fermentations.length === 0 && farmName) {
    return (
      <EmptyState
        action={
          <Button onClick={onClear} size="office" variant="outline">
            Limpiar filtros
          </Button>
        }
        illustration={DryingShed}
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
        illustration={DryingShed}
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
          fermentation={fermentation}
          key={fermentation.lot.id}
          lotHref={lotHref}
          now={now}
        />
      ))}
    </ul>
  );
}
