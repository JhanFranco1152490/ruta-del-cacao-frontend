'use client';

import { CloudOff } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LeafInspection } from '@/components/illustrations/leaf-inspection';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { Pagination } from '@/components/pagination';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { LoadingBlock } from '@/components/loading-block';

import { useHealthHistory } from '../history-api';
import { type HistoryFilters, historyQuery } from '../history-filters';
import { historyRows } from '../history-rows';
import type { useHistoryFilters } from '../use-history-filters';
import { HistoryCards } from './history-cards';
import { PestSummaryCards } from './pest-summary-cards';
import { ScheduleMonitoringLink } from './schedule-monitoring-link';

// Lo que devuelve la API por página.
const PAGE_SIZE = 20;

// La pestaña Historial: los monitoreos ya registrados, una fila por plaga o enfermedad, con los
// filtros de la pantalla. Con una parcela elegida se ve además cómo evoluciona cada plaga.
export function HistoryTab({
  filters,
  filterState,
}: {
  filters: HistoryFilters;
  filterState: ReturnType<typeof useHistoryFilters>;
}) {
  const { data: user } = useSession();
  const { page, hasFilters } = filterState;
  const request = historyQuery(filters, page);
  const history = useHealthHistory(
    user?.id,
    'query' in request ? request.query : null,
  );
  const neverLoaded =
    isPausedWithoutData(history) ||
    (history.isError && isNetworkFailure(history.error));
  const data = history.data?.data;
  const results = data?.results ?? [];

  return (
    <div className="space-y-4">
      {history.data?.savedAt !== undefined && (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold">
          <CloudOff aria-hidden="true" className="size-4 shrink-0" />
          Sin conexión: estás viendo la última copia del historial.
        </p>
      )}
      {history.isPending && !neverLoaded && 'query' in request && (
        <LoadingBlock label="Cargando historial" shapes={['h-64']} />
      )}
      {neverLoaded && (
        <EmptyState
          description="Ábrelo una vez con conexión y quedará guardado para verlo sin conexión."
          illustration={OfflineCloud}
          title="Necesitas conexión para ver este historial"
        />
      )}
      {history.isError && !neverLoaded && (
        <ErrorState
          message="No fue posible cargar el historial."
          onRetry={() => void history.refetch()}
        />
      )}
      {history.isSuccess &&
        data &&
        (results.length === 0 ? (
          hasFilters ? (
            <EmptyState
              illustration={LeafInspection}
              title="No hay monitoreos con estos filtros"
            />
          ) : (
            <EmptyState
              action={
                <ScheduleMonitoringLink
                  farm={filters.farm}
                  plot={filters.plot}
                />
              }
              description="Cuando se registre el resultado de un monitoreo aparecerá aquí."
              illustration={LeafInspection}
              title="Todavía no hay monitoreos registrados"
            />
          )
        ) : (
          <>
            {filters.plot && <PestSummaryCards summary={data.summary} />}
            <HistoryCards rows={historyRows(results)} />
            <Pagination
              label="monitoreos"
              onPageChange={filterState.setPage}
              page={page}
              pageSize={PAGE_SIZE}
              total={data.count}
            />
          </>
        ))}
    </div>
  );
}
