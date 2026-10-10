'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { PageNotice } from '@/components/page-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/api/query-keys';
import { todayInBogota } from '@/lib/format/dates';

import { ACTIVITIES_PATH } from '../activity-paths';
import { activityState, canComplete } from '../activity-state';
import { completionLabel } from '../completion-values';
import { isCorrectableCompletionError } from '../sync-adapter';
import { CompletionCapture } from './completion-capture';
import { CompletionSavedPanel } from './completion-saved-panel';
import { useCompletionSources } from './use-completion-sources';

// La pantalla de campo donde se registra una labor como realizada. Todo se guarda primero en el
// dispositivo: con conexión se envía de inmediato y, sin ella, cuando vuelva. Aquí se decide qué
// mostrar: un aviso si la actividad no se puede registrar, lo que le pasó a lo ya guardado, o la
// captura.
export function CompletionScreen({ activityId }: { activityId: string }) {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const today = todayInBogota();
  const sources = useCompletionSources(activityId);
  const [saved, setSaved] = useState(false);
  // Al corregir después de guardar se monta una captura nueva con lo que quedó en la cola.
  const [round, setRound] = useState(0);

  if (sources.status === 'missing') {
    return <PageNotice title="Esta actividad ya no existe." />;
  }
  if (sources.status === 'unreachable') {
    return (
      <PageNotice
        description="Ábrela una vez con conexión desde Actividades y quedará guardada para registrarla sin conexión."
        title="Necesitas conexión para abrir esta actividad."
      />
    );
  }
  if (sources.status === 'loading') {
    return (
      <div
        aria-label="Cargando actividad"
        className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8"
        role="status"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const { activity, queued } = sources;
  // Ya quedó guardada en el dispositivo (ahora, o en otra visita) y no hay nada que corregir.
  if (saved || (queued && queued.status !== 'error')) {
    return (
      <CompletionSavedPanel
        activityId={activityId}
        backPath={ACTIVITIES_PATH}
        canCorrect={isCorrectableCompletionError}
        label={completionLabel(activity)}
        onCorrect={() => {
          void queryClient
            .invalidateQueries({
              queryKey: queryKeys.agriculturalActivities.queued(
                user?.id ?? '',
                activityId,
              ),
            })
            .then(() => {
              setRound((value) => value + 1);
              setSaved(false);
            });
        }}
      />
    );
  }

  const item = { activity, ...activityState(activity, today) };
  if (!canComplete(item.state, activity.activity_type)) {
    const done = item.state === 'done';
    return (
      <PageNotice
        description={
          done
            ? 'Una actividad realizada no se modifica.'
            : 'El registro del monitoreo se habilita con el módulo de sanidad.'
        }
        title={
          done
            ? 'Esta actividad ya fue registrada como realizada.'
            : 'Esta actividad no se registra aquí.'
        }
      />
    );
  }

  return (
    <CompletionCapture
      catalog={sources.catalog}
      item={item}
      key={round}
      onSaved={() => setSaved(true)}
      rejected={queued}
      stocks={sources.stocks}
      today={today}
    />
  );
}
