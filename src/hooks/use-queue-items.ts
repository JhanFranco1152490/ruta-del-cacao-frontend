'use client';

import { getOfflineDb, type QueueItem } from '@/lib/offline/db';

import { useLiveRead } from './use-live-read';

const byAttention = (a: QueueItem, b: QueueItem) =>
  Number(b.status === 'error') - Number(a.status === 'error') ||
  b.updatedAt - a.updatedAt;

// Lo que sigue en la cola de la persona, de cualquier recurso: primero lo que falló, luego lo
// más reciente. Se actualiza sola cuando la cola cambia; mientras llega la lectura de la persona
// actual no se muestra la de otra que usó el equipo.
export const useQueueItems = (userId: string | undefined) =>
  useLiveRead(
    userId,
    async () =>
      (await getOfflineDb(userId!).queue.toArray())
        .filter((item) => item.status !== 'synced')
        .sort(byAttention),
    [],
  );
