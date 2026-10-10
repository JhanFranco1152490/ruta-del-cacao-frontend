'use client';

import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  type CompletionPayload,
  completionQueueId,
  enqueueCompletion,
  getQueuedCompletion,
  listQueuedCompletions,
  type QueuedCompletion,
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

// Las realizaciones que siguen en este dispositivo, por actividad: esperando conexión o rechazadas
// por el servidor. Se actualiza sola cuando la cola cambia; si no se puede leer, no hay ninguna
// que mostrar.
export function useQueuedCompletionStatuses(userId: string | undefined) {
  const [state, setState] = useState<{
    userId?: string;
    items: QueuedCompletion[];
  }>({ items: [] });

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      listQueuedCompletions(userId),
    ).subscribe({
      next: (items) => setState({ userId, items }),
      error: () => setState({ userId, items: [] }),
    });
    return () => subscription.unsubscribe();
  }, [userId]);

  // Mientras llega la lectura de esta persona no se muestra la de otra.
  const items = state.userId === userId ? state.items : undefined;
  return useMemo(
    () =>
      new Map(
        (items ?? []).map(({ activityId, status }) => [
          activityId,
          status === 'error' ? ('error' as const) : ('pending' as const),
        ]),
      ),
    [items],
  );
}
