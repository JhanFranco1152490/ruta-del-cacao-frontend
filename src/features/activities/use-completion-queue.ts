'use client';

import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import {
  listQueuedByParent,
  type QueuedByParent,
} from '@/lib/offline/queued-by-parent';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  COMPLETION_RESOURCE,
  type CompletionPayload,
  completionQueueId,
  enqueueCompletion,
  getQueuedCompletion,
  resubmitCompletion,
} from './completion-queue';

// La realización de una actividad que sigue en el dispositivo, leída una sola vez: con ella se
// abre la pantalla al corregir.
export const useQueuedCompletion = (activityId: string) =>
  useQueuedRecord(
    (userId) => queryKeys.agriculturalActivities.queued(userId, activityId),
    (userId) => getQueuedCompletion(userId, activityId),
  );

type SaveInput = {
  activityId: string;
  payload: CompletionPayload;
  // Se corrige la que el servidor rechazó, en vez de guardar una nueva.
  correcting: boolean;
};

// Toda realización se guarda primero en el dispositivo; con conexión se intenta enviar de
// inmediato y, sin ella, la cola lo hará al volver la red.
export const useSaveCompletion = () =>
  useQueueMutation(
    async (userId: string, { activityId, payload, correcting }: SaveInput) => {
      if (correcting) {
        await resubmitCompletion(userId, activityId, payload);
      } else {
        await enqueueCompletion(userId, activityId, payload);
      }
      sendWhenOnline(userId);
    },
  );

export const useDiscardCompletion = () =>
  useQueueMutation((userId: string, activityId: string) =>
    discard(userId, completionQueueId(activityId)),
  );

// Lo que cierra una actividad y sigue en este dispositivo, por actividad: su realización y lo que
// otros dominios registran en su lugar (`closingResources`, como el resultado de un monitoreo),
// esperando conexión o rechazado por el servidor. Se actualiza solo cuando la cola cambia; si no se
// puede leer, no hay nada que mostrar.
export function useQueuedCompletionStatuses(
  userId: string | undefined,
  closingResources: readonly string[] = [],
) {
  const [state, setState] = useState<{
    userId?: string;
    items: QueuedByParent[];
  }>({ items: [] });
  // La lista llega como prop: se compara por su contenido para no volver a suscribirse en cada
  // render.
  const resourcesKey = [COMPLETION_RESOURCE, ...closingResources].join('|');

  useEffect(() => {
    if (!userId) return;
    const resources = resourcesKey.split('|');
    const subscription = liveQuery(() =>
      listQueuedByParent(userId, resources),
    ).subscribe({
      next: (items) => setState({ userId, items }),
      error: () => setState({ userId, items: [] }),
    });
    return () => subscription.unsubscribe();
  }, [userId, resourcesKey]);

  // Mientras llega la lectura de esta persona no se muestra la de otra.
  const items = state.userId === userId ? state.items : undefined;
  return useMemo(
    () =>
      new Map(
        (items ?? []).map(({ parentId, status }) => [
          parentId,
          status === 'error' ? ('error' as const) : ('pending' as const),
        ]),
      ),
    [items],
  );
}
