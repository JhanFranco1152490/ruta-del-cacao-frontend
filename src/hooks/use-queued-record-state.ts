'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { getOfflineDb } from '@/lib/offline/db';

export type QueuedRecordState =
  | { status: 'pending' }
  | { status: 'error'; errorMessage?: string }
  // Ya no está en la cola: el envío terminó bien y el registro está en el servidor.
  | { status: 'synced' };

// Sigue en vivo un registro recién guardado (una finca, una parcela, una ficha), para contar lo que
// de verdad le pasó en vez de suponer que sigue esperando conexión. `queueId` es el de su item en
// la cola.
export function useQueuedRecordState(
  userId: string | undefined,
  queueId: string,
) {
  const [state, setState] = useState<QueuedRecordState>({ status: 'pending' });

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      getOfflineDb(userId).queue.get(queueId),
    ).subscribe({
      next: (item) =>
        setState(
          !item
            ? { status: 'synced' }
            : item.status === 'error'
              ? { status: 'error', errorMessage: item.errorMessage }
              : { status: 'pending' },
        ),
    });
    return () => subscription.unsubscribe();
  }, [userId, queueId]);

  return state;
}
