'use client';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  enqueueFarmCreate,
  enqueueFarmUpdate,
  getQueuedFarm,
  type QueuedFarm,
  resubmitFarm,
} from './farm-queue';
import type { FarmFormValues } from './schemas';

export const useQueuedFarm = (id: string) =>
  useQueuedRecord(
    (userId) => queryKeys.farms.queued(userId, id),
    (userId) => getQueuedFarm(userId, id),
  );

type FarmInput = { id: string; values: FarmFormValues };

// Toda finca nueva se guarda primero en el dispositivo; con conexión se intenta enviar de
// inmediato y, sin ella, la cola lo hará al volver la red. El guardado ya terminó en el
// dispositivo, así que no se espera el envío.
export const useFarmCreate = () =>
  useQueueMutation(async (userId: string, { id, values }: FarmInput) => {
    await enqueueFarmCreate(userId, id, values);
    sendWhenOnline(userId);
  });

export const useFarmUpdate = () =>
  useQueueMutation(
    async (
      userId: string,
      { id, values, expectedVersion }: FarmInput & { expectedVersion: number },
    ) => {
      await enqueueFarmUpdate(userId, id, values, expectedVersion);
      sendWhenOnline(userId);
    },
  );

export const useFarmResubmit = () =>
  useQueueMutation(
    async (
      userId: string,
      {
        farm,
        values,
        expectedVersion,
      }: {
        farm: QueuedFarm;
        values: FarmFormValues;
        expectedVersion?: number;
      },
    ) => {
      await resubmitFarm(userId, farm, values, expectedVersion);
      sendWhenOnline(userId);
    },
  );

export const useFarmDiscard = () =>
  useQueueMutation((userId: string, id: string) => discard(userId, id));
