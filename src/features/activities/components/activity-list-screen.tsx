'use client';

import { CloudOff } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormMessage } from '@/components/form-message';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { groupActivitiesByDay } from '../activity-days';
import { useActivitiesOfMonth } from '../api';
import { useActivityMonth } from '../use-activity-month';
import { useQueuedCompletionStatuses } from '../use-completion-queue';
import { ActivityDayList } from './activity-day-list';
import {
  ActivityDialogs,
  type ActivityNotice,
  type PendingDialog,
} from './activity-dialogs';
import { ActivityMonthBar } from './activity-month-bar';
import { ScheduleActivityButton } from './schedule-activity-button';

export function ActivityListScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const {
    month,
    today,
    isCurrentMonth,
    goPrevious,
    goNext,
    goToday,
    goToMonth,
  } = useActivityMonth();
  const activities = useActivitiesOfMonth(user?.id, month, null);

  const offline = !hasConnection || activities.data?.savedAt !== undefined;
  // Sin red y sin copia de este mes: no es una carga en curso ni un fallo del servidor.
  const neverLoaded =
    isPausedWithoutData(activities) ||
    (activities.isError && isNetworkFailure(activities.error));
  const completions = useQueuedCompletionStatuses(user?.id);
  const days = groupActivitiesByDay(
    activities.data?.data ?? [],
    today,
    completions,
  );
  const [pending, setPending] = useState<PendingDialog>();
  // Lo último que pasó, en un aviso que leen los lectores de pantalla. Si la actividad quedó en
  // otro mes, la lista no salta: el aviso ofrece ir a verla.
  const [notice, setNotice] = useState<ActivityNotice>();

  const scheduleButton = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD) && (
    <ScheduleActivityButton
      offline={offline}
      onClick={() => {
        setNotice(undefined);
        setPending({ kind: 'schedule' });
      }}
    />
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <PageHeader
        actions={scheduleButton || undefined}
        description="Las labores de tus parcelas: lo programado, lo retrasado, lo vencido y lo realizado."
        eyebrow="Manejo agrícola"
        title="Actividades"
      />
      <div className="mt-6 space-y-3 empty:hidden">
        <FormMessage variant={notice?.variant}>{notice?.message}</FormMessage>
        {notice?.month && notice.month !== month && (
          <Button
            onClick={() => goToMonth(notice.month!)}
            size="office"
            variant="outline"
          >
            Ver en su mes
          </Button>
        )}
      </div>
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
              onSelect={({ activity }) => {
                setNotice(undefined);
                setPending({ kind: 'detail', id: activity.id });
              }}
            />
          ))}
      </div>
      <ActivityDialogs
        items={days.flatMap((day) => day.activities)}
        offline={offline}
        onNotice={setNotice}
        onPending={setPending}
        pending={pending}
        today={today}
      />
    </div>
  );
}
