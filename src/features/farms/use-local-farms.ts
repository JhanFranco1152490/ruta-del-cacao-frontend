'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { getOfflineDb } from '@/lib/offline/db';

import { FARM_RESOURCE } from './farm-queue';
import {
  byFarmName,
  type FarmListItem,
  queuedFarmToListItem,
} from './farm-list-item';

type LocalFarms = {
  userId?: string;
  farms?: FarmListItem[];
  isError: boolean;
};

// Fincas creadas o editadas en este dispositivo que todavía no llegaron al servidor
// (pendientes o con error). Se actualiza sola cuando la cola cambia.
export function useLocalFarms(userId: string | undefined) {
  const [state, setState] = useState<LocalFarms>({ isError: false });

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      getOfflineDb(userId)
        .queue.where('resource')
        .equals(FARM_RESOURCE)
        .toArray(),
    ).subscribe({
      next: (items) =>
        setState({
          userId,
          isError: false,
          farms: items.map(queuedFarmToListItem).sort(byFarmName),
        }),
      error: () => setState({ userId, isError: true }),
    });
    return () => subscription.unsubscribe();
  }, [userId]);

  // Mientras llega la lectura del usuario actual no se muestra la de otro que usó el equipo.
  const isCurrent = !!userId && state.userId === userId;
  return {
    farms: isCurrent ? state.farms : undefined,
    isError: isCurrent && state.isError,
  };
}
