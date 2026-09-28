'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { getOfflineDb } from '@/lib/offline/db';
import { isWithinOfflineWindow } from '@/lib/offline/session-clock';

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  errorCount: number;
  isWithinOfflineWindow: boolean;
}

const DEFAULT_STATUS: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  errorCount: 0,
  isWithinOfflineWindow: true,
};

export function useSyncStatus(userId: string | undefined): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(DEFAULT_STATUS);

  useEffect(() => {
    if (!userId) return;

    const updateOnline = () =>
      setStatus((current) => ({ ...current, isOnline: navigator.onLine }));
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);

    const db = getOfflineDb(userId);
    const subscription = liveQuery(async () => ({
      pendingCount: await db.queue
        .where('status')
        .anyOf('pending', 'syncing')
        .count(),
      errorCount: await db.queue.where('status').equals('error').count(),
      isWithinOfflineWindow: await isWithinOfflineWindow(userId),
    })).subscribe({
      next: (value) => setStatus((current) => ({ ...current, ...value })),
    });

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      subscription.unsubscribe();
    };
  }, [userId]);

  return userId ? status : DEFAULT_STATUS;
}
