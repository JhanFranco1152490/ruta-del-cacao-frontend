import { useMemo } from 'react';

import { useSession } from '@/hooks/use-session';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import {
  useActiveCacaoVarieties,
  useFarmCharacterizations,
  usePlotsCharacterizations,
} from './api';
import { characterizationSummary } from './characterization-summary';
import {
  queuedSummaryLines,
  serverSummaryLines,
} from './characterization-values';
import { CHARACTERIZATION_PLOT_DELETED_CODE } from './sync-adapter';
import { useQueuedCharacterizations } from './use-characterization-queue';

// Lo que hace falta saber de la parcela y de su finca. Lo entrega quien une los dominios (el
// detalle de la finca, las pantallas generales): este no importa del de parcelas.
export type SummaryPlot = {
  id: string;
  code: string;
  isActive: boolean;
};

// El estado de la ficha de una parcela, para su resumen y sus acciones, que van en lugares
// distintos de la tarjeta. Todas las tarjetas de una finca (o de una página de parcelas, con
// `pagePlotIds`) comparten la misma consulta de fichas, así que usarlo dos veces en una tarjeta no
// pide nada de más.
export function usePlotCharacterization({
  plot,
  farmId,
  farmIsActive,
  pagePlotIds,
}: {
  plot: SummaryPlot;
  farmId: string;
  farmIsActive: boolean;
  // Las parcelas de la página en que está la tarjeta, cuando no son las de una sola finca.
  pagePlotIds?: readonly string[];
}) {
  const { data: user } = useSession();
  const canCharacterize = hasPermission(user, PERMISSIONS.CROPS_CHARACTERIZE);
  const byFarm = useFarmCharacterizations(user?.id, farmId, {
    enabled: !pagePlotIds,
  });
  const byPlots = usePlotsCharacterizations(user?.id, pagePlotIds ?? [], {
    enabled: !!pagePlotIds,
  });
  const server = pagePlotIds ? byPlots : byFarm;
  const catalog = useActiveCacaoVarieties(user?.id);
  const plotIds = useMemo(() => [plot.id], [plot.id]);
  const queued = useQueuedCharacterizations(user?.id, plotIds);

  const saved = server.data?.data.find((item) => item.plot_id === plot.id);
  const pending = queued.items?.[0];
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const variety of catalog.data?.data ?? [])
      map.set(variety.id, variety.name);
    for (const row of saved?.plantings ?? [])
      map.set(row.variety.id, row.variety.name);
    return map;
  }, [catalog.data, saved]);

  const failed = pending?.status === 'error';
  const plotDeleted = pending?.errorCode === CHARACTERIZATION_PLOT_DELETED_CODE;
  const summary = pending
    ? characterizationSummary(queuedSummaryLines(pending.fields, names))
    : saved
      ? characterizationSummary(serverSummaryLines(saved))
      : null;
  // Sin la lectura del servidor no se sabe si la parcela tiene ficha: decir "Sin caracterizar"
  // sería afirmar algo que no se sabe.
  const unreadable =
    !pending && !server.data && (server.isError || isPausedWithoutData(server));
  // La ficha queda congelada con su parcela o su finca inactiva.
  const canEdit =
    canCharacterize && plot.isActive && farmIsActive && !plotDeleted;
  const actionLabel = failed
    ? 'Corregir caracterización'
    : summary
      ? 'Editar caracterización'
      : unreadable
        ? 'Abrir caracterización'
        : 'Caracterizar';

  return {
    isLoading: server.isPending && !pending,
    saved,
    pending,
    failed,
    summary,
    unreadable,
    canEdit,
    actionLabel,
  };
}
