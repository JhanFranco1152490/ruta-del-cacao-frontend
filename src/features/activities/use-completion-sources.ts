'use client';

import { useSession } from '@/hooks/use-session';
import { useActivity } from '@/lib/api/activity-read';
import { isNotFound } from '@/lib/api/errors';
import type { CatalogInput } from '@/lib/input-usage';
import { useUsableInputs } from '@/lib/api/usable-inputs';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import type { AgriculturalActivity } from './api';
import type { QueuedCompletion } from './completion-queue';
import { useQueuedCompletion } from './use-completion-queue';

export type CompletionSources =
  // La actividad ya no existe en el servidor.
  | { status: 'missing' }
  // Sin red y sin copia de la actividad en el dispositivo.
  | { status: 'unreachable' }
  | { status: 'loading' }
  | {
      status: 'ready';
      activity: AgriculturalActivity;
      // La realización de esta actividad que sigue en el dispositivo, si hay una.
      queued: QueuedCompletion | undefined;
      // Los insumos activos, o `undefined` si el catálogo nunca se cargó en este dispositivo.
      catalog: CatalogInput[] | undefined;
      // Las existencias de la finca por insumo, o `undefined` si no hay copia de ellas.
      stocks: ReadonlyMap<string, string> | undefined;
    };

// Todo lo que la pantalla de realización lee antes de mostrar algo: la actividad, lo que ya haya
// de ella en la cola, el catálogo de insumos y las existencias de la finca. Cada lectura cae a su
// copia del dispositivo cuando no hay red.
export function useCompletionSources(activityId: string): CompletionSources {
  const { data: user } = useSession();
  const activity = useActivity(user?.id, activityId);
  const queued = useQueuedCompletion(activityId);
  const found = activity.data?.data;
  const inputs = useUsableInputs(user, {
    farmId: found?.plot.farm.id ?? null,
    producerId: found?.producer_id ?? null,
    enabled: !!found,
  });

  if (isPausedWithoutData(activity) || activity.isError) {
    return isNotFound(activity.error)
      ? { status: 'missing' }
      : { status: 'unreachable' };
  }
  const waiting = activity.isPending || queued.isPending || inputs.isPending;
  if (waiting || !found) return { status: 'loading' };

  return {
    status: 'ready',
    activity: found,
    queued: queued.data ?? undefined,
    catalog: inputs.catalog,
    stocks: inputs.stocks,
  };
}
