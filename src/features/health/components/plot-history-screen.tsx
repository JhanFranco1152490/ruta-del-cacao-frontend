'use client';

import { CloudOff } from 'lucide-react';

import { Breadcrumb } from '@/components/breadcrumb';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { isApiError, isNetworkFailure } from '@/lib/api/errors';
import { usePlot } from '@/lib/api/plot-read';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { usePlotHistory } from '../history-api';
import { historyQuery } from '../history-filters';
import { pestFilterOptions, summaryText } from '../history-summary';
import { useHistoryFilters } from '../use-history-filters';
import { HistoryFiltersBar } from './history-filters-bar';
import { HistoryMonitoringItem } from './history-monitoring-item';

// El historial fitosanitario de una parcela: cómo evoluciona cada plaga y qué se hizo con ella. Lo
// ve quien consulta actividades, dentro de las fincas que alcanza. Sin conexión, lo último que se
// cargó con los mismos filtros.
export function PlotHistoryScreen({ plotId }: { plotId: string }) {
  const { data: user } = useSession();
  const plot = usePlot(user?.id, plotId);
  const filterState = useHistoryFilters();
  const { filters, hasFilters } = filterState;
  const request = historyQuery(filters);
  const history = usePlotHistory(
    user?.id,
    plotId,
    'query' in request ? request.query : null,
  );
  // Las plagas que se ofrecen en el filtro salen del historial sin filtros, que ya trae una fila por
  // cada plaga que apareció en la parcela.
  const unfiltered = usePlotHistory(user?.id, plotId, {});
  const found = plot.data?.data;
  const neverLoaded =
    isPausedWithoutData(history) ||
    (history.isError && isNetworkFailure(history.error));

  if (isApiError(plot.error) && plot.error.status === 404) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
        <EmptyState title="Esta parcela ya no existe" />
      </div>
    );
  }

  const results = history.data?.data.results ?? [];
  const summary = history.data?.data.summary ?? [];
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Parcelas', href: '/parcelas' },
          { label: found ? `${found.code} · ${found.farm.name}` : 'Parcela' },
        ]}
      />
      <PageHeader
        description={
          found
            ? `Parcela ${found.code} · ${found.farm.name}`
            : 'Los monitoreos de la parcela y sus controles.'
        }
        eyebrow="Sanidad de la parcela"
        title="Historial fitosanitario"
      />
      <div className="mt-6 space-y-6">
        <HistoryFiltersBar
          filters={filters}
          hasFilters={hasFilters}
          onClear={filterState.clear}
          onFrom={filterState.setFrom}
          onPest={filterState.setPest}
          onTo={filterState.setTo}
          periodError={'error' in request ? request.error : undefined}
          pestOptions={pestFilterOptions(
            unfiltered.data?.data.summary ?? [],
            filters.pest ? { value: filters.pest, rows: summary } : undefined,
          )}
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
          (results.length === 0 ? (
            hasFilters ? (
              <EmptyState
                action={
                  <Button
                    onClick={filterState.clear}
                    type="button"
                    variant="outline"
                  >
                    Limpiar filtros
                  </Button>
                }
                title="No hay registros con estos filtros"
              />
            ) : (
              <EmptyState title="No hay registros fitosanitarios para esta parcela" />
            )
          ) : (
            <>
              {summary.length > 0 && (
                <section
                  aria-label="Resumen por plaga"
                  className="rounded-[var(--radius-card)] bg-card p-5 shadow-card"
                >
                  <p className="section-label">Resumen por plaga</p>
                  <ul className="mt-2 space-y-1">
                    {summary.map((row) => (
                      <li
                        key={`${row.pest_disease?.id ?? row.other_description}-${row.sampling_unit}`}
                      >
                        {summaryText(row)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <ul aria-label="Monitoreos" className="space-y-4">
                {results.map((activity) => (
                  <HistoryMonitoringItem
                    activity={activity}
                    key={activity.id}
                  />
                ))}
              </ul>
            </>
          ))}
      </div>
    </div>
  );
}
