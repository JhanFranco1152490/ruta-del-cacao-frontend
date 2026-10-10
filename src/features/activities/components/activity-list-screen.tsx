'use client';

import { CloudOff } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { groupActivitiesByDay } from '../activity-days';
import { type UsedInput, useActivitiesOfMonth } from '../api';
import { useActivityMonth } from '../use-activity-month';
import { ActivityDayList } from './activity-day-list';
import { ActivityDetailDialog } from './activity-detail-dialog';
import { ActivityMonthBar } from './activity-month-bar';

// Cómo se escribe la cantidad de un insumo usado llega de la página: este dominio no conoce las
// unidades ni las presentaciones de los insumos.
export function ActivityListScreen({
  formatUsedInput,
}: {
  formatUsedInput: (used: UsedInput) => string;
}) {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const { month, today, isCurrentMonth, goPrevious, goNext, goToday } =
    useActivityMonth();
  const activities = useActivitiesOfMonth(user?.id, month, null);

  const offline = !hasConnection || activities.data?.savedAt !== undefined;
  // Sin red y sin copia de este mes: no es una carga en curso ni un fallo del servidor.
  const neverLoaded =
    isPausedWithoutData(activities) ||
    (activities.isError && isNetworkFailure(activities.error));
  const days = groupActivitiesByDay(activities.data?.data ?? [], today);
  // Se guarda solo el id: el detalle muestra la actividad como está en la lista, también después
  // de que una acción la cambie, y se cierra solo si deja de estar.
  const [selectedId, setSelectedId] = useState<string>();
  const selected = days
    .flatMap((day) => day.activities)
    .find(({ activity }) => activity.id === selectedId);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        description="Las labores de tus parcelas: lo programado, lo retrasado, lo vencido y lo realizado."
        eyebrow="Manejo agrícola"
        title="Actividades"
      />
      {offline && activities.isSuccess && (
        <p
          className="mt-6 flex gap-3 rounded-lg border border-border bg-card p-4 text-sm font-bold"
          role="status"
        >
          <CloudOff aria-hidden="true" className="size-5 shrink-0" />
          Sin conexión: estás viendo la última copia de las actividades.
        </p>
      )}
      <div className="mt-8 space-y-6">
        <ActivityMonthBar
          isCurrentMonth={isCurrentMonth}
          month={month}
          onNext={goNext}
          onPrevious={goPrevious}
          onToday={goToday}
        />
        {activities.isPending && !neverLoaded && (
          <div aria-label="Cargando actividades" role="status">
            <Skeleton className="h-64" />
          </div>
        )}
        {neverLoaded && (
          <EmptyState
            action={
              !isCurrentMonth && (
                <Button onClick={goToday} size="office" variant="outline">
                  Ir a hoy
                </Button>
              )
            }
            description="Cuando tengas conexión, abre este mes una vez y quedará guardado para consultarlo sin conexión."
            title="Necesitas conexión para ver las actividades de este mes."
          />
        )}
        {activities.isError && !neverLoaded && (
          <ErrorState
            message="No fue posible cargar las actividades."
            onRetry={() => void activities.refetch()}
          />
        )}
        {activities.isSuccess &&
          (days.length === 0 ? (
            <EmptyState
              description="Las labores que se programen en tus parcelas para este mes aparecerán aquí."
              title="No hay actividades programadas en este periodo"
            />
          ) : (
            <ActivityDayList
              days={days}
              onSelect={({ activity }) => setSelectedId(activity.id)}
            />
          ))}
      </div>
      {selected && (
        <ActivityDetailDialog
          formatUsedInput={formatUsedInput}
          item={selected}
          onClose={() => setSelectedId(undefined)}
          today={today}
        />
      )}
    </div>
  );
}
