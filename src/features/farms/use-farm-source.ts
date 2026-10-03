'use client';

import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';

import { type Farm, useFarmDetail } from './api';
import type { QueuedFarm } from './farm-queue';
import { useQueuedFarm } from './use-farm-queue';

export type FarmSource =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  // Lo que sigue en la cola de este dispositivo: un alta que todavía no existe en el servidor, o
  // una edición pendiente de una finca que sí existe.
  | { status: 'queued'; queued: QueuedFarm }
  | { status: 'server'; farm: Farm; savedAt?: number };

// De dónde sale la finca que se muestra: primero lo pendiente en el dispositivo y, si no hay
// nada, el servidor (con su copia sin conexión).
export function useFarmSource(id: string): FarmSource {
  const { data: user } = useSession();
  const queued = useQueuedFarm(id);
  const needsServer = !queued.isPending && !queued.isError && !queued.data;
  const farm = useFarmDetail(needsServer ? user?.id : undefined, id);

  if (queued.isPending) return { status: 'loading' };
  if (queued.isError) {
    return {
      status: 'error',
      message: 'No fue posible leer la finca guardada en este dispositivo.',
    };
  }
  if (queued.data) return { status: 'queued', queued: queued.data };

  if (farm.isPending) return { status: 'loading' };
  if (farm.isError) {
    return {
      status: 'error',
      message:
        isApiError(farm.error) && farm.error.status === 404
          ? 'No encontramos esta finca entre las tuyas.'
          : 'No fue posible cargar la finca. Si no la has abierto antes con conexión, necesitas conexión para verla.',
    };
  }
  return { status: 'server', farm: farm.data.data, savedAt: farm.data.savedAt };
}
