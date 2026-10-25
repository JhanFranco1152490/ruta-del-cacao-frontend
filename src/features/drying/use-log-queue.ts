'use client';

import {
  useDiscardLotRecord,
  useQueuedLotRecord,
  useQueuedRecords,
  useSaveLotRecord,
} from '@/hooks/use-record-queue';
import { queryKeys } from '@/lib/api/query-keys';

import { logQueue } from './log-queue';

export const useQueuedLogs = (userId: string | undefined) =>
  useQueuedRecords(logQueue, userId);

export const useQueuedLog = (logId: string) =>
  useQueuedLotRecord(
    logQueue,
    (userId) => queryKeys.drying.queued(userId, logId),
    logId,
  );

export const useSaveLog = () => useSaveLotRecord(logQueue);

export const useDiscardLog = () => useDiscardLotRecord(logQueue);
