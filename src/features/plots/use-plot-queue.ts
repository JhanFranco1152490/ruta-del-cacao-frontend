'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/api/query-keys';
import { getOfflineDb } from '@/lib/offline/db';
import { discard, processQueue } from '@/lib/offline/sync-queue';

import {
  enqueuePlotCreate,
  enqueuePlotUpdate,
  getQueuedPlot,
  listQueuedPlots,
  type PlotFormValues,
  type QueuedPlot,
  resubmitPlot,
} from './plot-queue';

// Leer y escribir la cola del dispositivo no usa la red. Por defecto TanStack Query pausa todo
// mientras no hay conexión (espera a que vuelva): aquí eso dejaba "Guardando…" colgado y la
// parcela sin guardar hasta recuperar la señal, justo lo contrario de lo que se busca.
const LOCAL_ONLY = 'always' as const;

// Se lee una sola vez: el formulario se inicializa con esta lectura y no debe adoptar una
// posterior mientras la persona corrige.
export function useQueuedPlot(id: string) {
  const { data: user } = useSession();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.plots.queued(userId ?? '', id),
    queryFn: () => getQueuedPlot(userId!, id),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 0,
    networkMode: LOCAL_ONLY,
  });
}

type LocalPlots = {
  userId?: string;
  farmId?: string;
  plots?: QueuedPlot[];
  isError: boolean;
};

// Las parcelas de una finca que siguen en este dispositivo (pendientes o con error). Se
// actualiza sola cuando la cola cambia.
export function useQueuedPlots(userId: string | undefined, farmId: string) {
  const [state, setState] = useState<LocalPlots>({ isError: false });

  useEffect(() => {
    if (!userId) return;
    const subscription = liveQuery(() =>
      listQueuedPlots(userId, farmId),
    ).subscribe({
      next: (plots) => setState({ userId, farmId, isError: false, plots }),
      error: () => setState({ userId, farmId, isError: true }),
    });
    return () => subscription.unsubscribe();
  }, [userId, farmId]);

  // Mientras llega la lectura de esta persona y esta finca no se muestra la de otra.
  const isCurrent =
    !!userId && state.userId === userId && state.farmId === farmId;
  return {
    plots: isCurrent ? state.plots : undefined,
    isError: isCurrent && state.isError,
  };
}

function useQueueMutation<T>(
  action: (userId: string, input: T) => Promise<void>,
) {
  const { data: user } = useSession();
  return useMutation({
    networkMode: LOCAL_ONLY,
    mutationFn: async (input: T) => {
      if (!user) throw new Error('No hay una sesión activa.');
      await action(user.id, input);
    },
  });
}

const sendWhenOnline = (userId: string) => {
  if (navigator.onLine) void processQueue(userId);
};

// Toda parcela nueva se guarda primero en el dispositivo; con conexión se intenta enviar de
// inmediato y, sin ella, la cola lo hará al volver la red. El guardado ya terminó en el
// dispositivo, así que no se espera el envío.
export const usePlotCreate = () =>
  useQueueMutation(
    async (
      userId: string,
      {
        id,
        farmId,
        values,
      }: { id: string; farmId: string; values: PlotFormValues },
    ) => {
      await enqueuePlotCreate(userId, id, farmId, values);
      sendWhenOnline(userId);
    },
  );

export const usePlotUpdate = () =>
  useQueueMutation(
    async (
      userId: string,
      {
        id,
        farmId,
        values,
        expectedVersion,
      }: {
        id: string;
        farmId: string;
        values: PlotFormValues;
        expectedVersion: number;
      },
    ) => {
      await enqueuePlotUpdate(userId, id, farmId, values, expectedVersion);
      sendWhenOnline(userId);
    },
  );

export const usePlotResubmit = () =>
  useQueueMutation(
    async (
      userId: string,
      {
        plot,
        values,
        expectedVersion,
      }: {
        plot: QueuedPlot;
        values: PlotFormValues;
        expectedVersion?: number;
      },
    ) => {
      await resubmitPlot(userId, plot, values, expectedVersion);
      sendWhenOnline(userId);
    },
  );

export const usePlotDiscard = () =>
  useQueueMutation((userId: string, id: string) => discard(userId, id));

export type QueuedPlotState =
  | { status: 'pending' }
  | { status: 'error'; errorMessage?: string }
  // Ya no está en la cola: el envío terminó bien y la parcela está en el servidor.
  | { status: 'synced' };

// Sigue en vivo una parcela recién guardada, para contar lo que de verdad le pasó en vez de
// suponer que sigue esperando conexión.
export function useQueuedPlotState(userId: string | undefined, id: string) {
  const [state, setState] = useState<QueuedPlotState>({ status: 'pending' });

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
