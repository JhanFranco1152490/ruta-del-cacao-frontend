'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/hooks/use-session';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, processQueue } from '@/lib/offline/sync-queue';

import {
  enqueueFarmCreate,
  enqueueFarmUpdate,
  getQueuedFarm,
  type QueuedFarm,
  resubmitFarm,
} from './farm-queue';
import type { FarmFormValues } from './schemas';

// Leer y escribir la cola del dispositivo no usa la red. Por defecto TanStack Query pausa todo
// mientras no hay conexión (espera a que vuelva): aquí eso dejaba "Guardando…" colgado y la
// finca sin guardar hasta recuperar la señal, justo lo contrario de lo que se busca.
const LOCAL_ONLY = 'always' as const;

// Se lee una sola vez: el formulario se inicializa con esta lectura y no debe adoptar una
// posterior mientras la persona corrige.
export function useQueuedFarm(id: string) {
  const { data: user } = useSession();
  const userId = user?.id;
  return useQuery({
    queryKey: queryKeys.farms.queued(userId ?? '', id),
    queryFn: () => getQueuedFarm(userId!, id),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 0,
    networkMode: LOCAL_ONLY,
  });
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

type FarmInput = { id: string; values: FarmFormValues };

// Toda finca nueva se guarda primero en el dispositivo; con conexión se intenta enviar de
// inmediato y, sin ella, la cola lo hará al volver la red. El guardado ya terminó en el
// dispositivo, así que no se espera el envío.
export const useFarmCreate = () =>
  useQueueMutation(async (userId: string, { id, values }: FarmInput) => {
    await enqueueFarmCreate(userId, id, values);
    if (navigator.onLine) void processQueue(userId);
  });

export const useFarmUpdate = () =>
  useQueueMutation(
    async (
      userId: string,
      { id, values, expectedVersion }: FarmInput & { expectedVersion: number },
    ) => {
      await enqueueFarmUpdate(userId, id, values, expectedVersion);
      if (navigator.onLine) void processQueue(userId);
    },
  );

export const useFarmResubmit = () =>
  useQueueMutation(
    async (
      userId: string,
      {
        farm,
        values,
        expectedVersion,
      }: {
        farm: QueuedFarm;
        values: FarmFormValues;
        expectedVersion?: number;
      },
    ) => {
      await resubmitFarm(userId, farm, values, expectedVersion);
      if (navigator.onLine) void processQueue(userId);
    },
  );

export const useFarmDiscard = () =>
  useQueueMutation((userId: string, id: string) => discard(userId, id));
