'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageNotice } from '@/components/page-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';

import { mayRecordFor } from '../activity-actions';
import { ACTIVITIES_PATH } from '../activity-paths';
import { activityState, canComplete } from '../activity-state';
import { CompletionCapture } from './completion-capture';
import { useCompletionSources } from './use-completion-sources';

// La pantalla de campo donde se registra una labor como realizada. Todo se guarda primero en el
// dispositivo: con conexión se envía de inmediato y, sin ella, cuando vuelva. Aquí se decide qué
// mostrar: un aviso si la actividad no se puede registrar, lo que le pasó a lo ya guardado, o la
// captura.
export function CompletionScreen({ activityId }: { activityId: string }) {
  const today = todayInBogota();
  const sources = useCompletionSources(activityId);
  const { returnPath, finish } = useFinishSave(ACTIVITIES_PATH);
  // Entre guardar y que la navegación llegue, la lectura de lo guardado ya cambió: sin esto se vería
  // un instante el aviso de «ya está guardada».
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { data: user } = useSession();
  // Quien llega escribiendo la dirección de una actividad que no le toca registrar vuelve a la
  // pantalla de antes sin aviso: el botón ya no se le ofrece, y lo que guardara aquí el servidor
  // lo rechazaría.
  const notYours =
    sources.status === 'ready' &&
    !!user &&
    !mayRecordFor(user, sources.activity.assignee.id);
  useEffect(() => {
    if (notYours) router.replace(returnPath);
  }, [notYours, router, returnPath]);

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

  if (notYours) return null;
  const { activity, queued } = sources;
  // Ya quedó guardada en el dispositivo (en otra visita) y no hay nada que corregir: si el
  // servidor la rechaza, el aviso y la bandeja ofrecen corregirla.
  if (saved) return null;
  if (queued && queued.status !== 'error') {
    return (
      <PageNotice
        description="Está en los registros del dispositivo y se enviará al servidor."
        title="Esta realización ya está guardada."
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
      cancelHref={returnPath}
      onSaved={() => {
        setSaved(true);
        finish('Realización registrada');
      }}
      rejected={queued}
      stocks={sources.stocks}
      today={today}
    />
  );
}
