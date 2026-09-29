'use client';

import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/api';
import { queryKeys } from '@/lib/api/query-keys';
import { discard, processQueue } from '@/lib/offline/sync-queue';

import { enqueueFarmCreate, getQueuedFarm, resubmitFarm } from './farm-queue';
import type { FarmFormValues } from './schemas';

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
  });
}

function useQueueMutation<T>(
  action: (userId: string, input: T) => Promise<void>,
) {
  const { data: user } = useSession();
  return useMutation({
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

export const useFarmResubmit = () =>
  useQueueMutation(async (userId: string, { id, values }: FarmInput) => {
    await resubmitFarm(userId, id, values);
    if (navigator.onLine) void processQueue(userId);
  });

export const useFarmDiscard = () =>
  useQueueMutation((userId: string, id: string) => discard(userId, id));
