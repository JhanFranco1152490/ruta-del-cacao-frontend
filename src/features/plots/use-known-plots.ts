'use client';

import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useFarmPlots } from './api';
import { type KnownPlot, mergeKnownPlots } from './known-plots';
import { useQueuedPlots } from './use-plot-queue';

// Las parcelas de la finca que conoce este dispositivo: las del servidor (o su copia sin
// conexión) con lo pendiente de la cola encima. Con ellas se validan el área disponible, la
// superposición y los códigos.
export function useKnownPlots(
  farmId: string,
  // Una finca que todavía no existe en el servidor no tiene parcelas allá que leer.
  { fromServer = true } = {},
) {
  const { data: user } = useSession();
  const canView = hasPermission(user, PERMISSIONS.PLOTS_VIEW);
  const server = useFarmPlots(user?.id, farmId, {
    enabled: canView && fromServer,
  });
  const queued = useQueuedPlots(user?.id, farmId);

  const plots = useMemo<KnownPlot[] | undefined>(
    () =>
      queued.plots
        ? mergeKnownPlots(server.data?.data.plots ?? [], queued.plots)
        : undefined,
    [server.data, queued.plots],
  );

  const serverSettled = !fromServer || !canView || !server.isPending;
  return {
    plots,
    // Mientras no llegue la lectura del servidor (o su copia) ni la de la cola.
    isLoading: !plots || !serverSettled,
    // El servidor no respondió y no hay copia: se sigue con lo que hay en el dispositivo y las
    // comprobaciones de área y superposición quedan al servidor.
    serverUnavailable: fromServer && canView && server.isError,
    queuedPlots: queued.plots,
    serverPlots: server.data?.data.plots,
    savedAt: server.data?.savedAt,
    hasMore: server.data?.data.hasMore ?? false,
    refetchServer: () => void server.refetch(),
    isError: queued.isError,
  };
}
