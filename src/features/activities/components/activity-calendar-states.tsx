import { CloudOff } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { Button } from '@/components/ui/button';
import { formatMonthYear } from '@/lib/format/dates';

import type { ActivityView } from '../activity-view';

const STATUS_NOTE_CLASS =
  'flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold';

const NEEDS_CONNECTION = {
  mes: 'Necesitas conexión para ver las actividades de este mes.',
  lista: 'Necesitas conexión para ver las actividades de este mes.',
  parcela: 'Necesitas conexión para ver las actividades de este mes.',
  semana: 'Necesitas conexión para ver las actividades de esta semana.',
  pendientes: 'Necesitas conexión para ver las actividades pendientes.',
} as const;

// Lo que se ve es una copia del dispositivo, o le faltan meses que nunca se cargaron.
export function CalendarStatusNotes({
  showingCopy,
  missingMonths,
}: {
  showingCopy: boolean;
  missingMonths: readonly string[];
}) {
  return (
    <div className="mt-3 space-y-2 empty:hidden">
      {showingCopy && (
        <p className={STATUS_NOTE_CLASS} role="status">
          <CloudOff aria-hidden="true" className="size-4 shrink-0" />
          Sin conexión: estás viendo la última copia de las actividades.
        </p>
      )}
      {missingMonths.length > 0 && (
        <p className={STATUS_NOTE_CLASS} role="status">
          <CloudOff aria-hidden="true" className="size-4 shrink-0" />
          Necesitas conexión para ver las actividades de{' '}
          {missingMonths.map(formatMonthYear).join(' y ')}.
        </p>
      )}
    </div>
  );
}

// Lo que ocupa el lugar de la vista mientras carga, si nunca se cargó sin conexión o si falló.
// `onGoToday` lleva al periodo de hoy, que puede estar guardado en el dispositivo.
export function CalendarLoadState({
  view,
  isPending,
  neverLoaded,
  failed,
  onRetry,
  onGoToday,
}: {
  view: ActivityView;
  isPending: boolean;
  neverLoaded: boolean;
  failed: boolean;
  onRetry: () => void;
  onGoToday?: () => void;
}) {
  if (isPending) {
    return <LoadingBlock label="Cargando actividades" shapes={['h-64']} />;
  }
  if (neverLoaded) {
    return (
      <EmptyState
        action={
          onGoToday && (
            <Button onClick={onGoToday} size="office" variant="outline">
              Ir a hoy
            </Button>
          )
        }
        description="Cuando tengas conexión, abre esta vista una vez y quedará guardada para consultarla sin conexión."
        illustration={OfflineCloud}
        title={NEEDS_CONNECTION[view]}
      />
    );
  }
  if (failed) {
    return (
      <ErrorState
        message="No fue posible cargar las actividades."
        onRetry={onRetry}
      />
    );
  }
  return null;
}
