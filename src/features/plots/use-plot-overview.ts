'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { usePlotBefore, usePlots, usePlotsByIds } from './api';
import { type KnownFarms, mergeOverviewPlots } from './plot-overview';
import type { usePlotFilters } from './use-plot-filters';
import { useQueuedPlots } from './use-plot-queue';

const NO_IDS: readonly string[] = [];

// Las parcelas de Mis parcelas: la página del servidor (o su copia sin conexión) con lo pendiente
// de todas las fincas encima. Con el filtro "Con error", solo lo que falló en el dispositivo: las
// parcelas que no se pudieron enviar y las de `failedPlotIds`, cuya ficha no se pudo enviar.
export function usePlotOverview(
  filters: ReturnType<typeof usePlotFilters>,
  { failedPlotIds = NO_IDS }: { failedPlotIds?: readonly string[] } = {},
) {
  const { data: user } = useSession();
  const ownProducer = !!user?.producer_id;
  // La página se pide también con "Con error": sus conteos alimentan el contador.
  const list = usePlots(user?.id, filters.query);
  const before = usePlotBefore(user?.id, filters.query, {
    enabled: filters.grouping !== 'ninguno' && !filters.onlyErrors,
  });
  const queued = useQueuedPlots(user?.id);
  const failed = usePlotsByIds(
    user?.id,
    filters.onlyErrors ? failedPlotIds : NO_IDS,
  );
  // Para nombrar la finca de una parcela que solo está en el dispositivo. La cuenta técnica ve
  // fincas de todos: solo se piden las del productor elegido.
  const farmOptions = useFarmOptions(user?.id, filters.producer ?? undefined, {
    enabled: ownProducer || !!filters.producer,
  });

  const farms = farmOptions.data?.data.options;
  const knownFarms = useMemo<KnownFarms>(
    () =>
      new Map(
        (farms ?? []).map((farm) => [
          farm.id,
          { name: farm.name, isActive: farm.isActive, producer: farm.producer },
        ]),
      ),
    [farms],
  );
  const serverPlots = filters.onlyErrors
    ? failed.plots
    : list.data?.data.results;
  const { search, farm, producer } = filters.query;
  const onlyErrors = filters.onlyErrors;
  const plots = useMemo(
    () =>
      queued.plots &&
      mergeOverviewPlots(
        serverPlots ?? [],
        queued.plots,
        { search, farm, producer, onlyErrors },
        knownFarms,
      ),
    [serverPlots, queued.plots, search, farm, producer, onlyErrors, knownFarms],
  );

  // Sin conexión se muestra lo del dispositivo en vez de un esqueleto sin fin.
  const serverUnreachable = isPausedWithoutData(list);
  return {
    plots,
    isLoading:
      (list.isPending && !list.isLoadingError && !serverUnreachable) ||
      (filters.onlyErrors && failed.isLoading) ||
      (!queued.plots && !queued.isError),
    serverError: list.isLoadingError,
    queueError: queued.isError,
    serverUnreachable,
    savedAt: list.data?.savedAt,
    total: filters.onlyErrors ? undefined : list.data?.data.count,
    counts: list.data?.data.characterization_counts,
    // La última parcela de la página anterior, para decir si un grupo continúa.
    before: before.data,
    refetch: () => void list.refetch(),
  };
}
