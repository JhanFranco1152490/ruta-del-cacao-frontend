'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useActivity } from '@/lib/api/activity-read';
import { isApiError } from '@/lib/api/errors';
import { isFarmEmployee } from '@/lib/farm-scope';
import {
  useAgriculturalInputs,
  useFarmInputs,
  useInputStocks,
} from '@/lib/api/input-catalog';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import type { AgriculturalActivity } from '../api';
import type { QueuedCompletion } from '../completion-queue';
import type { CatalogInput } from '../completion-values';
import { useQueuedCompletion } from '../use-completion-queue';

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
  // La cuenta técnica lee el catálogo del productor de la actividad, y el Productor el suyo
  // completo. Un empleado, solo los insumos que hay en la finca de la actividad: aunque trabaje en
  // varias fincas, lo que gasta sale de esa.
  const employee = isFarmEmployee(user);
  const productCatalog = useAgriculturalInputs(
    user?.id,
    user?.is_superuser === true ? (found?.producer_id ?? null) : null,
    { enabled: !!found && !employee },
  );
  const farmCatalog = useFarmInputs(user?.id, found?.plot.farm.id ?? null, {
    enabled: !!found && employee,
  });
  const catalog = employee ? farmCatalog : productCatalog;
  const stocks = useInputStocks(user?.id, found?.plot.farm.id ?? null);

  const active = useMemo(
    () => catalog.data?.data.filter((input) => input.is_active),
    [catalog.data],
  );
  const stockByInput = useMemo(
    () =>
      stocks.data &&
      new Map(
        stocks.data.data.map((stock) => [stock.input_id, stock.quantity]),
      ),
    [stocks.data],
  );

  if (isPausedWithoutData(activity) || activity.isError) {
    return isApiError(activity.error) && activity.error.status === 404
      ? { status: 'missing' }
      : { status: 'unreachable' };
  }
  const waiting =
    activity.isPending ||
    queued.isPending ||
    (catalog.isPending && !isPausedWithoutData(catalog));
  if (waiting || !found) return { status: 'loading' };

  return {
    status: 'ready',
    activity: found,
    queued: queued.data ?? undefined,
    catalog: active,
    stocks: stockByInput,
  };
}
