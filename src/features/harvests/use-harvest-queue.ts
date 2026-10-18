'use client';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  enqueueHarvest,
  getQueuedHarvest,
  type HarvestPayload,
  harvestQueueId,
  resubmitHarvest,
} from './harvest-queue';

// La cosecha que sigue en el dispositivo, leída una sola vez: con ella se abre la pantalla al
// corregir desde la bandeja.
export const useQueuedHarvest = (harvestId: string) =>
  useQueuedRecord(
    (userId) => queryKeys.harvests.queued(userId, harvestId),
    (userId) => getQueuedHarvest(userId, harvestId),
  );

type SaveInput = {
  payload: HarvestPayload;
  // Se corrige la que el servidor rechazó, en vez de guardar una nueva.
  correcting: boolean;
};

// Toda cosecha se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato
// y, sin ella, la cola lo hará al volver la red.
export const useSaveHarvest = () =>
  useQueueMutation(
    async (userId: string, { payload, correcting }: SaveInput) => {
      if (correcting) {
        await resubmitHarvest(userId, payload);
      } else {
        await enqueueHarvest(userId, payload);
      }
      sendWhenOnline(userId);
    },
  );

export const useDiscardHarvest = () =>
  useQueueMutation((userId: string, harvestId: string) =>
    discard(userId, harvestQueueId(harvestId)),
  );
