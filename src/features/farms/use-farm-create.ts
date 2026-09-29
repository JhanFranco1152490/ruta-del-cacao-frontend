'use client';

import { useMutation } from '@tanstack/react-query';

import { useSession } from '@/features/auth/api';
import { processQueue } from '@/lib/offline/sync-queue';

import { enqueueFarmCreate } from './farm-queue';
import type { FarmFormValues } from './schemas';

export function useFarmCreate() {
  const { data: user } = useSession();

  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: FarmFormValues;
    }) => {
      if (!user) throw new Error('No hay una sesión activa.');
      await enqueueFarmCreate(user.id, id, values);
      // Con conexión se intenta enviar de inmediato; sin ella, la cola lo hará al volver la
      // red. El guardado ya terminó en el dispositivo, así que no se espera el envío.
      if (navigator.onLine) void processQueue(user.id);
    },
  });
}
