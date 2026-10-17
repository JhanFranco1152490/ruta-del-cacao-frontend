'use client';

import { useMemo } from 'react';

import { useLiveRead } from '@/hooks/use-live-read';
import type { components } from '@/lib/api/schema';
import { getOfflineDb } from '@/lib/offline/db';

import { CONTROL_RESOURCE } from './control-queue';
import { queuedControlActivity } from './queued-controls';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const EMPTY: readonly AgriculturalActivity[] = [];

// Los controles programados que esperan en este dispositivo, como actividades para el calendario.
// Se actualiza solo cuando la cola cambia; si no se puede leer, no hay ninguno que mostrar.
export function useQueuedControlActivities(
  userId: string | undefined,
): readonly AgriculturalActivity[] {
  const items = useLiveRead(
    userId,
    () =>
      getOfflineDb(userId!)
        .queue.where('resource')
        .equals(CONTROL_RESOURCE)
        .toArray(),
    [],
  );
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
