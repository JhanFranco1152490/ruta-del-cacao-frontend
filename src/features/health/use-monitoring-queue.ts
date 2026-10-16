'use client';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  enqueueMonitoring,
  getQueuedMonitoring,
  type MonitoringPayload,
  monitoringQueueId,
  resubmitMonitoring,
} from './monitoring-queue';

// El resultado de un monitoreo que sigue en el dispositivo, leído una sola vez: con él se abre la
// planilla al corregir.
export const useQueuedMonitoring = (activityId: string) =>
  useQueuedRecord(
    (userId) => queryKeys.health.queued(userId, activityId),
    (userId) => getQueuedMonitoring(userId, activityId),
  );

type SaveInput = {
  activityId: string;
  payload: MonitoringPayload;
  // Se corrige el que el servidor rechazó, en vez de guardar uno nuevo.
  correcting: boolean;
};

// Todo resultado se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato
// y, sin ella, la cola lo hará al volver la red.
export const useSaveMonitoring = () =>
  useQueueMutation(
    async (userId: string, { activityId, payload, correcting }: SaveInput) => {
      if (correcting) {
        await resubmitMonitoring(userId, activityId, payload);
      } else {
        await enqueueMonitoring(userId, activityId, payload);
      }
      sendWhenOnline(userId);
    },
  );

export const useDiscardMonitoring = () =>
  useQueueMutation((userId: string, activityId: string) =>
    discard(userId, monitoringQueueId(activityId)),
  );
