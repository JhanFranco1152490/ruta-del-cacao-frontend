'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  enqueuePlotCreate,
  enqueuePlotUpdate,
  getQueuedPlot,
  listQueuedPlots,
  type PlotFormValues,
  type QueuedPlot,
  resubmitPlot,
} from './plot-queue';

export const useQueuedPlot = (id: string) =>
  useQueuedRecord(
    (userId) => queryKeys.plots.queued(userId, id),
    (userId) => getQueuedPlot(userId, id),
  );

type LocalPlots = {
  userId?: string;
  farmId?: string;
  plots?: QueuedPlot[];
  isError: boolean;
};

// Las parcelas de una finca (o de todas, sin `farmId`) que siguen en este dispositivo
// (pendientes o con error). Se actualiza sola cuando la cola cambia.
export function useQueuedPlots(userId: string | undefined, farmId?: string) {
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
