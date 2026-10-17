'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useEffectEvent } from 'react';

import { useActivity } from '@/lib/api/activity-read';
import { notify } from '@/lib/notify';

import type { ActivityOfDay } from './activity-days';

export const LINKED_ACTIVITY_UNAVAILABLE = 'La actividad ya no está disponible';

// La actividad que llega en la URL (`?actividad=`, el enlace de una notificación) abre su detalle
// en cuanto el mes cargó. Si no está en ese mes (se reprogramó después del aviso), se busca sola y
// el calendario pasa a su mes; si ya no existe o la cuenta no la alcanza, se avisa. Atendido el
// enlace, el parámetro sale de la URL: cerrar el detalle o recargar no lo vuelve a abrir.
export function useLinkedActivity({
  userId,
  items,
  loaded,
  month,
  goToMonth,
  onOpen,
}: {
  userId: string | undefined;
  // Las actividades que se ven en el mes, ya cargadas o leídas de la copia del dispositivo.
  items: readonly ActivityOfDay[];
  loaded: boolean;
  month: string;
  goToMonth: (month: string) => void;
  onOpen: (activityId: string) => void;
}) {
  const [linked, setLinked] = useQueryState('actividad', parseAsString);
  const inList =
    !!linked && items.some(({ activity }) => activity.id === linked);
  const lookup = useActivity(userId, linked && loaded && !inList ? linked : '');

  const handle = useEffectEvent(() => {
    if (!linked || !loaded) return;
    if (inList) {
      onOpen(linked);
      void setLinked(null);
      return;
    }
    if (lookup.isError) {
      notify.warning(LINKED_ACTIVITY_UNAVAILABLE);
      void setLinked(null);
      return;
    }
    if (!lookup.data) return;
    const target = lookup.data.data.scheduled_date.slice(0, 7);
    if (target !== month) {
      goToMonth(target);
      return;
    }
    // Está en este mes pero no en la lista (un filtro la esconde, o el alcance cambió).
    notify.warning(LINKED_ACTIVITY_UNAVAILABLE);
    void setLinked(null);
  });

  useEffect(() => {
    handle();
  }, [linked, loaded, inList, lookup.isError, lookup.data, month]);
}
