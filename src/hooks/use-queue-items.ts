'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { getOfflineDb, type QueueItem } from '@/lib/offline/db';

const byAttention = (a: QueueItem, b: QueueItem) =>
  Number(b.status === 'error') - Number(a.status === 'error') ||
  b.updatedAt - a.updatedAt;

// Lo que sigue en la cola de la persona, de cualquier recurso: primero lo que falló, luego lo
// más reciente. Se actualiza sola cuando la cola cambia.
export function useQueueItems(userId: string | undefined) {
  const [state, setState] = useState<{ userId?: string; items?: QueueItem[] }>(
    {},
  );

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      getOfflineDb(userId).queue.toArray(),
    ).subscribe({
      next: (items) =>
        setState({
          userId,
          items: items
            .filter((item) => item.status !== 'synced')
            .sort(byAttention),
        }),
      error: () => setState({ userId, items: [] }),
    });
    return () => subscription.unsubscribe();
  }, [userId]);

  // Mientras llega la lectura de la persona actual no se muestra la de otra que usó el equipo.
  return userId && state.userId === userId ? state.items : undefined;
}
