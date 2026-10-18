'use client';

import { useQueueMutation } from '@/hooks/use-queue-mutation';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import { enqueueLot, type LotPayload, lotQueueId } from './lot-queue';

// Conformar un lote sin conexión (o con la cosecha todavía en el teléfono): se guarda primero en el
// dispositivo y la cola lo envía cuando pueda.
export const useEnqueueLot = () =>
  useQueueMutation(async (userId: string, payload: LotPayload) => {
    await enqueueLot(userId, payload);
    sendWhenOnline(userId);
  });

export const useDiscardLot = () =>
  useQueueMutation((userId: string, lotId: string) =>
    discard(userId, lotQueueId(lotId)),
  );
