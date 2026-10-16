'use client';

import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';

import type { components } from '@/lib/api/schema';
import { getOfflineDb, type QueueItem } from '@/lib/offline/db';

import { CONTROL_RESOURCE } from './control-queue';
import { queuedControlActivity } from './queued-controls';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const EMPTY: readonly AgriculturalActivity[] = [];

// Los controles programados que esperan en este dispositivo, como actividades para el calendario.
// Se actualiza solo cuando la cola cambia; si no se puede leer, no hay ninguno que mostrar.
export function useQueuedControlActivities(
  userId: string | undefined,
): readonly AgriculturalActivity[] {
  const [state, setState] = useState<{
    userId?: string;
    items: QueueItem[];
  }>({ items: [] });

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      getOfflineDb(userId)
        .queue.where('resource')
        .equals(CONTROL_RESOURCE)
        .toArray(),
    ).subscribe({
      next: (items) => setState({ userId, items }),
      error: () => setState({ userId, items: [] }),
    });
    return () => subscription.unsubscribe();
  }, [userId]);

  // Mientras llega la lectura de esta persona no se muestra la de otra.
  const items = state.userId === userId ? state.items : undefined;
  return useMemo(
    () =>
      items
        ? items.flatMap((item) => {
            const activity = queuedControlActivity(item);
            return activity ? [activity] : [];
          })
        : EMPTY,
    [items],
  );
}
