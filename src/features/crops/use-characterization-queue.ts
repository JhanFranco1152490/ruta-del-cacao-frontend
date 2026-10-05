'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, processQueue } from '@/lib/offline/sync-queue';

import {
  characterizationQueueId,
  enqueueCharacterization,
  getQueuedCharacterization,
  listQueuedCharacterizations,
  type QueuedCharacterization,
  resubmitCharacterization,
} from './characterization-queue';
import type { CharacterizationFormFields } from './schemas';

// Leer y escribir la cola del dispositivo no usa la red: sin esto, TanStack Query pausaría el
// guardado mientras no hay conexión, justo cuando más se necesita.
const LOCAL_ONLY = 'always' as const;

// Se lee una sola vez: el formulario se inicializa con esta lectura y no debe adoptar otra
// mientras la persona corrige.
export function useQueuedCharacterization(plotId: string) {
  const { data: user } = useSession();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.characterizations.queued(userId ?? '', plotId),
    queryFn: () => getQueuedCharacterization(userId!, plotId),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 0,
    networkMode: LOCAL_ONLY,
  });
}

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

const sendWhenOnline = (userId: string) => {
  if (navigator.onLine) void processQueue(userId);
};

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
export function useSaveCharacterization() {
  const { data: user } = useSession();
  return useMutation({
    networkMode: LOCAL_ONLY,
    mutationFn: async ({
      plotId,
      fields,
      queued,
      expectedVersion,
    }: SaveInput) => {
      if (!user) throw new Error('No hay una sesión activa.');
      if (queued) {
        await resubmitCharacterization(
          user.id,
          queued,
          fields,
          expectedVersion,
        );
      } else {
        await enqueueCharacterization(user.id, plotId, fields, expectedVersion);
      }
      sendWhenOnline(user.id);
    },
  });
}

export function useDiscardCharacterization() {
  const { data: user } = useSession();
  return useMutation({
    networkMode: LOCAL_ONLY,
    mutationFn: async (plotId: string) => {
      if (!user) throw new Error('No hay una sesión activa.');
      await discard(user.id, characterizationQueueId(plotId));
    },
  });
}
