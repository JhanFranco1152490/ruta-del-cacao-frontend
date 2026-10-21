'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PageNotice } from '@/components/page-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';
import { mayRecordFor } from '@/lib/activity-recorders';
import { todayInBogota } from '@/lib/format/dates';
import { ACTIVITIES_PATH } from '@/lib/paths/activities';

import { MonitoringCapture } from './monitoring-capture';
import { useMonitoringSources } from './use-monitoring-sources';
import { pageContainerClass } from '@/components/page-container';

// La pantalla de campo donde se registra el resultado de un monitoreo. Aquí se decide qué mostrar:
// un aviso si no se puede registrar, lo que le pasó a lo ya guardado, o la planilla.
export function MonitoringScreen({
  activityId,
  plotTrees = null,
}: {
  activityId: string;
  // Los árboles que suma la ficha de la parcela, si se saben: quien une los dominios los lee.
  plotTrees?: number | null;
}) {
  const today = todayInBogota();
  const sources = useMonitoringSources(activityId);
  const { returnPath, finish } = useFinishSave(ACTIVITIES_PATH);
  // Entre guardar y que la navegación llegue, la lectura de lo guardado ya cambió: sin esto se vería
  // un instante el aviso de «ya está guardado».
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { data: user } = useSession();
  // Quien llega escribiendo la dirección de un monitoreo que no le toca registrar vuelve a la
  // pantalla de antes sin aviso: el botón ya no se le ofrece, y el servidor lo rechazaría.
  const notYours =
    sources.status === 'ready' &&
    !!user &&
    !mayRecordFor(user, sources.activity.assignee.id);
  useEffect(() => {
    if (notYours) router.replace(returnPath);
  }, [notYours, router, returnPath]);

  if (sources.status === 'missing') {
    return <PageNotice title="Este monitoreo ya no existe." />;
  }
  if (sources.status === 'unreachable') {
    return (
      <PageNotice
        description="Ábrelo una vez con conexión desde Actividades y quedará guardado para registrarlo sin conexión."
        title="Necesitas conexión para abrir este monitoreo."
      />
    );
  }
  if (sources.status === 'loading') {
    return (
      <div
        aria-label="Cargando monitoreo"
        className={pageContainerClass('narrow', 'space-y-6')}
        role="status"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (notYours || saved) return null;
  const { activity, queued, pests, choices } = sources;
  if (activity.activity_type !== 'phytosanitary_monitoring') {
    return <PageNotice title="Esta actividad no es un monitoreo." />;
  }
  if (activity.status === 'done') {
    return (
      <PageNotice
        description="Un monitoreo registrado no se modifica. Si hubo un error, programa otro."
        title="Este monitoreo ya fue registrado."
      />
    );
  }
  // Ya quedó guardado en el dispositivo (en otra visita) y no hay nada que corregir: si el
  // servidor lo rechaza, el aviso y la bandeja ofrecen corregirlo.
  if (queued && queued.status !== 'error') {
    return (
      <PageNotice
        description="Está en los registros del dispositivo y se enviará al servidor."
        title="Este monitoreo ya está guardado."
      />
    );
  }

  return (
    <MonitoringCapture
      activity={activity}
      cancelHref={returnPath}
      choices={choices}
      onSaved={() => {
        setSaved(true);
        finish('Monitoreo registrado');
      }}
      pests={pests}
      plotTrees={plotTrees}
      rejected={queued}
      today={today}
    />
  );
}
