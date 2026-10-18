'use client';

import { useLiveRead } from '@/hooks/use-live-read';
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

const NONE: readonly QueuedPhoto[] = [];

// Las fotos de una actividad que esperan en este dispositivo, para mostrarlas con "Pendiente de
// enviar" junto a las del servidor. Se actualiza sola cuando la cola cambia.
export const useQueuedEvidence = (
  userId: string | undefined,
  activityId: string,
): readonly QueuedPhoto[] =>
  useLiveRead(
    userId && `${userId}:${activityId}`,
    () => listQueuedEvidence(userId!, activityId),
    NONE,
  ) ?? NONE;
