'use client';

import { useQueryClient } from '@tanstack/react-query';
import { liveQuery } from 'dexie';
import { useEffect, useRef, useState } from 'react';

import { queryKeys } from '@/lib/api/query-keys';
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

// Cuando una finca sale de la cola (se sincronizó o se descartó), la lista del servidor puede
// haber cambiado: se vuelve a pedir para que la finca aparezca con sus datos del servidor.
export function useRefreshFarmsWhenQueueShrinks(
  farms: readonly FarmListItem[] | undefined,
) {
  const queryClient = useQueryClient();
  const previousIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!farms) return;
    const ids = new Set(farms.map((farm) => farm.id));
    const left = [...(previousIds.current ?? [])].some((id) => !ids.has(id));
    previousIds.current = ids;
    if (left) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.farms.all() });
    }
  }, [farms, queryClient]);
}

export type QueuedFarmState =
  | { status: 'pending' }
  | { status: 'error'; errorMessage?: string }
  // Ya no está en la cola: el envío terminó bien y la finca está en el servidor.
  | { status: 'synced' };

// Sigue en vivo una finca recién guardada, para contar lo que de verdad le pasó en vez de
// suponer que sigue esperando conexión.
export function useQueuedFarmState(userId: string | undefined, id: string) {
  const [state, setState] = useState<QueuedFarmState>({ status: 'pending' });

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      getOfflineDb(userId).queue.get(id),
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
  }, [userId, id]);

  return state;
}
