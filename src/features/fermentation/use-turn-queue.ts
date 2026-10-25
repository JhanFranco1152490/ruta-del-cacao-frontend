'use client';

import {
  useDiscardLotRecord,
  useQueuedLotRecord,
  useQueuedRecords,
  useSaveLotRecord,
} from '@/hooks/use-record-queue';
import { queryKeys } from '@/lib/api/query-keys';

import { turnQueue } from './turn-queue';

export const useQueuedTurns = (userId: string | undefined) =>
  useQueuedRecords(turnQueue, userId);

export const useQueuedTurn = (turnId: string) =>
  useQueuedLotRecord(
    turnQueue,
    (userId) => queryKeys.fermentation.queued(userId, turnId),
    turnId,
  );

export const useSaveTurn = () => useSaveLotRecord(turnQueue);

export const useDiscardTurn = () => useDiscardLotRecord(turnQueue);
