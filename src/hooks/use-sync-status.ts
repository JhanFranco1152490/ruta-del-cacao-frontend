'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { getOfflineDb } from '@/lib/offline/db';
import { isWithinOfflineWindow } from '@/lib/offline/session-clock';
import type { SyncStatus } from '@/types/sync';

const DEFAULT_STATUS: SyncStatus = {
  isOnline: true,
  pendingCount: 0,
  errorCount: 0,
  isWithinOfflineWindow: true,
};

// Cada cuánto se vuelve a evaluar la ventana de 7 días aunque nadie escriba en la cola: sin
// esto, alguien que deja la app abierta justo cuando se cumple el plazo seguiría viendo
// "dentro de la ventana" hasta la próxima escritura local.
const OFFLINE_WINDOW_CHECK_MS = 60_000;

export function useSyncStatus(userId: string | undefined): SyncStatus {
  // Ajuste de estado durante el renderizado (no en un efecto): al cambiar de usuario, el
  // conteo de la persona anterior no debe alcanzar a pintarse ni un instante para la nueva.
  const [trackedUserId, setTrackedUserId] = useState(userId);
  const [status, setStatus] = useState<SyncStatus>(DEFAULT_STATUS);
  if (userId !== trackedUserId) {
    setTrackedUserId(userId);
    setStatus(DEFAULT_STATUS);
  }

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

    const windowCheck = setInterval(() => {
      void isWithinOfflineWindow(userId).then((value) =>
        setStatus((current) => ({ ...current, isWithinOfflineWindow: value })),
      );
    }, OFFLINE_WINDOW_CHECK_MS);

    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      subscription.unsubscribe();
      clearInterval(windowCheck);
    };
  }, [userId]);

  return userId ? status : DEFAULT_STATUS;
}
