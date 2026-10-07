'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { usePlots } from './api';
import { type KnownFarms, mergeOverviewPlots } from './plot-overview';
import type { usePlotFilters } from './use-plot-filters';
import { useQueuedPlots } from './use-plot-queue';

// Las parcelas de la pantalla general: la página del servidor (o su copia sin conexión) con lo
// pendiente de todas las fincas encima.
export function usePlotOverview(filters: ReturnType<typeof usePlotFilters>) {
  const { data: user } = useSession();
  const ownProducer = !!user?.producer_id;
  const list = usePlots(user?.id, filters.query);
  const queued = useQueuedPlots(user?.id);
  // La cuenta técnica ve fincas de todos: el filtro de finca aparece cuando elige un productor.
  const farmOptions = useFarmOptions(user?.id, filters.producer ?? undefined, {
    enabled: ownProducer || !!filters.producer,
  });

  const farms = farmOptions.data?.data;
  const knownFarms = useMemo<KnownFarms>(
    () =>
      new Map(
        (farms ?? []).map((farm) => [
          farm.id,
          { name: farm.name, isActive: farm.isActive },
        ]),
      ),
    [farms],
  );
  const serverPlots = list.data?.data.results;
  const { search, farm, producer } = filters.query;
  const plots = useMemo(
    () =>
      queued.plots &&
      mergeOverviewPlots(
        serverPlots ?? [],
        queued.plots,
        { search, farm, producer },
        knownFarms,
      ),
    [serverPlots, queued.plots, search, farm, producer, knownFarms],
  );

  // Sin conexión se muestra lo del dispositivo en vez de un esqueleto sin fin.
  const serverUnreachable = isPausedWithoutData(list);
  return {
    plots,
    farms,
    isLoading:
      (list.isPending && !list.isLoadingError && !serverUnreachable) ||
      (!queued.plots && !queued.isError),
    serverError: list.isLoadingError,
    queueError: queued.isError,
    serverUnreachable,
    savedAt: list.data?.savedAt,
    total: list.data?.data.count,
    refetch: () => void list.refetch(),
  };
}
