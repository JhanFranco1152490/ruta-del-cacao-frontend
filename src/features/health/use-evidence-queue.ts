'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { useQueueMutation } from '@/hooks/use-queue-mutation';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  enqueueEvidence,
  type EvidencePayload,
  evidenceQueueId,
  listQueuedEvidence,
} from './evidence-queue';

// Toda foto se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato y,
// sin ella, la cola lo hará al volver la red. Las de un monitoreo esperan a que llegue su resultado.
export const useSaveEvidence = () =>
  useQueueMutation(async (userId: string, photos: EvidencePayload[]) => {
    for (const photo of photos) await enqueueEvidence(userId, photo);
    sendWhenOnline(userId);
  });

export const useDiscardEvidence = () =>
  useQueueMutation((userId: string, evidenceId: string) =>
    discard(userId, evidenceQueueId(evidenceId)),
  );

type QueuedPhoto = Awaited<ReturnType<typeof listQueuedEvidence>>[number];

// Las fotos de una actividad que esperan en este dispositivo, para mostrarlas con "Pendiente de
// enviar" junto a las del servidor. Se actualiza sola cuando la cola cambia.
export function useQueuedEvidence(
  userId: string | undefined,
  activityId: string,
): readonly QueuedPhoto[] {
  const [state, setState] = useState<{ key?: string; photos: QueuedPhoto[] }>({
    photos: [],
  });
  const key = userId && `${userId}:${activityId}`;
  useEffect(() => {
    if (!userId || !key) return;
    const subscription = liveQuery(() =>
      listQueuedEvidence(userId, activityId),
    ).subscribe({
      next: (photos) => setState({ key, photos }),
      error: () => setState({ key, photos: [] }),
    });
    return () => subscription.unsubscribe();
  }, [userId, activityId, key]);
  // Mientras llega la lectura de esta actividad no se muestra la de otra.
  return state.key === key ? state.photos : [];
}
