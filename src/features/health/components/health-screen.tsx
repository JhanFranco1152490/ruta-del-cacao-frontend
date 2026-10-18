'use client';

import { CloudOff } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { useHealthHistory } from '../history-api';
import { historyQuery } from '../history-filters';
import { pestFilterOptions } from '../history-summary';
import { useHistoryChoices } from '../use-history-choices';
import { useHistoryFilters } from '../use-history-filters';
import { HistoryFiltersBar } from './history-filters-bar';
import { HistoryMonitoringItem } from './history-monitoring-item';
import { PestSummarySection } from './pest-summary-section';
import { ScheduleMonitoringLink } from './schedule-monitoring-link';
import { WaitingControlsNotice } from './waiting-controls-notice';

// Lo que devuelve la API por página.
const PAGE_SIZE = 20;

// Sanidad: el historial de los monitoreos de todo lo que alcanza la cuenta, con filtros de finca,
// parcela, plaga y periodo en la dirección. Desde la tarjeta de una parcela se abre ya filtrado por
// ella, y con una parcela elegida se ve además cómo evoluciona cada plaga. Arriba, lo que pide
// atención (las detecciones que esperan un control) y programar un monitoreo.
export function HealthScreen() {
  const { data: user } = useSession();
  const filterState = useHistoryFilters();
  const { page, hasFilters } = filterState;
  // El productor solo lo elige la cuenta técnica: las demás ya ven lo suyo.
  const superuser = user?.is_superuser === true;
  const filters = {
    ...filterState.filters,
    producer: superuser ? filterState.filters.producer : null,
  };
  const request = historyQuery(filters, page);
  const history = useHealthHistory(
    user?.id,
    'query' in request ? request.query : null,
  );
  const choices = useHistoryChoices(filters);

  const neverLoaded =
    isPausedWithoutData(history) ||
    (history.isError && isNetworkFailure(history.error));
  const data = history.data?.data;
  const results = data?.results ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <PageHeader
        actions={
          <ScheduleMonitoringLink farm={filters.farm} plot={filters.plot} />
        }
        description="Los monitoreos de tus parcelas: qué se encontró, cómo evoluciona cada plaga y qué se hizo con ella."
        eyebrow="Sanidad de las parcelas"
        title="Sanidad"
      />
      <div className="mt-6 space-y-6">
        <WaitingControlsNotice producer={filters.producer} />
        <HistoryFiltersBar
          farmName={choices.farmName}
          farmOptions={choices.farmOptions}
          filters={filters}
          hasFilters={hasFilters}
          onClear={filterState.clear}
          onFarm={filterState.setFarm}
          onFrom={filterState.setFrom}
          onPest={filterState.setPest}
          onPlot={filterState.setPlot}
          onProducer={superuser ? filterState.setProducer : undefined}
          onTo={filterState.setTo}
          periodError={'error' in request ? request.error : undefined}
          pestOptions={pestFilterOptions(choices.pests, filters.pest)}
          plotCode={choices.plotCode}
          plotOptions={choices.plotOptions}
        />
        {history.data?.savedAt !== undefined && (
          <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-bold">
            <CloudOff aria-hidden="true" className="size-4 shrink-0" />
            Sin conexión: estás viendo la última copia del historial.
          </p>
        )}
        {history.isPending && !neverLoaded && 'query' in request && (
          <div aria-label="Cargando historial" role="status">
            <Skeleton className="h-64" />
          </div>
        )}
        {neverLoaded && (
          <EmptyState
            description="Ábrelo una vez con conexión y quedará guardado para verlo sin conexión."
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
              <EmptyState title="No hay monitoreos con estos filtros" />
            ) : (
              <EmptyState
                action={
                  <ScheduleMonitoringLink
                    farm={filters.farm}
                    plot={filters.plot}
                  />
                }
                description="Cuando se registre el resultado de un monitoreo aparecerá aquí."
                title="Todavía no hay monitoreos registrados"
              />
            )
          ) : (
            <>
              {filters.plot && <PestSummarySection summary={data.summary} />}
              <ul aria-label="Monitoreos" className="space-y-4">
                {results.map((activity) => (
                  <HistoryMonitoringItem
                    activity={activity}
                    key={activity.id}
                  />
                ))}
              </ul>
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
    </div>
  );
}
