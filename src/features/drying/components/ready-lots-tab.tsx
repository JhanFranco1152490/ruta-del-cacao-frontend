import { Sun } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { SunDryingTray } from '@/components/illustrations/sun-drying-tray';
import { LoadingBlock } from '@/components/loading-block';
import { Button } from '@/components/ui/button';
import { formatDecimal } from '@/lib/format/decimal';
import { farmLabel } from '@/lib/format/place-label';

import type { ReadyLot } from '../api';

// La pestaña Listos para secar: los lotes Fermentado de las fincas que la cuenta alcanza, ya
// filtrados por finca. Necesita conexión, como iniciar.
export function ReadyLotsTab({
  lots,
  farmName,
  offline,
  isPending,
  isError,
  onRetry,
  onClear,
  onStart,
}: {
  lots: readonly ReadyLot[];
  farmName: string | null;
  offline: boolean;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  onClear: () => void;
  onStart: (lot: ReadyLot) => void;
}) {
  if (offline) {
    return (
      <EmptyState
        illustration={OfflineCloud}
        title="Ver los lotes listos para secar necesita conexión."
      />
    );
  }
  if (isError) {
    return (
      <ErrorState
        message="No fue posible cargar los lotes listos para secar."
        onRetry={onRetry}
      />
    );
  }
  if (isPending) {
    return <LoadingBlock label="Cargando lotes" shapes={['h-40']} />;
  }
  if (lots.length === 0) {
    return farmName ? (
      <EmptyState
        action={
          <Button onClick={onClear} size="office" variant="outline">
            Limpiar filtros
          </Button>
        }
        illustration={SunDryingTray}
        title={`Ningún lote listo para secar en ${farmName}.`}
      />
    ) : (
      <EmptyState
        illustration={SunDryingTray}
        title="No hay lotes listos para secar."
      />
    );
  }
  return (
    <ul
      aria-label="Lotes listos para secar"
      className="motion-stagger grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
    >
      {lots.map((lot) => (
        <li
          className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card"
          key={lot.id}
        >
          <div className="space-y-1">
            <p className="font-mono font-bold break-all">{lot.code}</p>
            <p className="text-sm text-muted-foreground">
              {farmLabel(lot.harvest.plot.farm)} ·{' '}
              {formatDecimal(lot.green_weight_kg, 1)} kg en verde
            </p>
          </div>
          <Button
            aria-label={`Iniciar secado de ${lot.code}`}
            className="mt-auto self-start max-sm:w-full"
            onClick={() => onStart(lot)}
            size="office"
          >
            <Sun aria-hidden="true" className="size-4" /> Iniciar secado
          </Button>
        </li>
      ))}
    </ul>
  );
}
