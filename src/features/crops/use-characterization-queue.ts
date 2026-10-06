'use client';

import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { useQueueMutation, useQueuedRecord } from '@/hooks/use-queue-mutation';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, sendWhenOnline } from '@/lib/offline/sync-queue';

import {
  characterizationQueueId,
  enqueueCharacterization,
  getQueuedCharacterization,
  listQueuedCharacterizations,
  type QueuedCharacterization,
  resubmitCharacterization,
} from './characterization-queue';
import type { CharacterizationFormFields } from './schemas';

export const useQueuedCharacterization = (plotId: string) =>
  useQueuedRecord(
    (userId) => queryKeys.characterizations.queued(userId, plotId),
    (userId) => getQueuedCharacterization(userId, plotId),
  );

type LocalCharacterizations = {
  key?: string;
  items?: QueuedCharacterization[];
  isError: boolean;
};

// Las fichas de estas parcelas que siguen en el dispositivo (pendientes o con error). Se
// actualiza sola cuando la cola cambia.
export function useQueuedCharacterizations(
  userId: string | undefined,
  plotIds: readonly string[],
) {
  const key = userId ? `${userId}:${[...plotIds].sort().join(',')}` : '';
  const [state, setState] = useState<LocalCharacterizations>({
    isError: false,
  });

  useEffect(() => {
    if (!userId) return;
    const ids = key
      .slice(userId.length + 1)
      .split(',')
      .filter(Boolean);
    const subscription = liveQuery(() =>
      listQueuedCharacterizations(userId, ids),
    ).subscribe({
      next: (items) => setState({ key, items, isError: false }),
      error: () => setState({ key, isError: true }),
    });
    return () => subscription.unsubscribe();
  }, [userId, key]);

  // Mientras llega la lectura de estas parcelas no se muestra la de otras.
  const isCurrent = !!userId && state.key === key;
  return {
    items: isCurrent ? state.items : undefined,
    isError: isCurrent && state.isError,
  };
}

type SaveInput = {
  plotId: string;
  fields: CharacterizationFormFields;
  // La ficha pendiente que se corrige, si la hay.
  queued?: QueuedCharacterization;
  // La versión vigente: la que se leyó del servidor (null si no tenía ficha) o, al corregir un
  // `stale_version`, la que llegó con el error.
  expectedVersion: number | null;
};

// Toda ficha se guarda primero en el dispositivo; con conexión se intenta enviar de inmediato y,
// sin ella, la cola lo hará al volver la red. Corregir una pendiente la reemplaza en la cola.
export const useSaveCharacterization = () =>
  useQueueMutation(
    async (
      userId: string,
      { plotId, fields, queued, expectedVersion }: SaveInput,
    ) => {
      if (queued) {
        await resubmitCharacterization(userId, queued, fields, expectedVersion);
      } else {
        await enqueueCharacterization(userId, plotId, fields, expectedVersion);
      }
      sendWhenOnline(userId);
    },
  );

export const useDiscardCharacterization = () =>
  useQueueMutation((userId: string, plotId: string) =>
    discard(userId, characterizationQueueId(plotId)),
  );
