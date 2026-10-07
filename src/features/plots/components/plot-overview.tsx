'use client';

import { type ReactNode, useRef, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PointsMapPanel } from '@/components/map/points-map-panel';
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { loadPointsMapProvider } from '@/config/map';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { PLOT_LIST_PAGE_SIZE } from '../api';
import type { OverviewPlot } from '../plot-overview';
import { plotsToShapes } from '../plot-map';
import { usePlotFilters } from '../use-plot-filters';
import { usePlotOverview } from '../use-plot-overview';
import { PlotFarmLine } from './plot-farm-line';
import { PlotList } from './plot-list';
import { PlotOverviewFiltersBar } from './plot-overview-filters-bar';

// Las parcelas de todas las fincas, con filtros y paginadas. La comparten la pantalla de parcelas
// (con mapa) y la de caracterización, que agrega a cada tarjeta lo de su dominio.
export function PlotOverview({
  showMap = false,
  farmHref,
  renderPlotDetails,
  renderSummary,
  emptyAction,
}: {
  showMap?: boolean;
  // A dónde lleva el nombre de la finca: la pantalla de otro dominio, que entrega la página.
  farmHref?: (farmId: string) => string;
  // Lo que otro dominio agrega a cada tarjeta. Recibe los ids de la página para pedir lo suyo en
  // una sola consulta.
  renderPlotDetails?: (
    plot: OverviewPlot,
    pagePlotIds: readonly string[],
  ) => ReactNode;
  renderSummary?: (pagePlotIds: readonly string[]) => ReactNode;
  emptyAction?: ReactNode;
}) {
  const { data: user } = useSession();
  const filters = usePlotFilters();
  const overview = usePlotOverview(filters);
  const ownProducer = !!user?.producer_id;
  const canOpenProducer = hasPermission(user, PERMISSIONS.PRODUCERS_VIEW);
  // Estado de la interfaz, no del servidor: qué parcela enfocar en el mapa y qué tarjeta resaltar.
  const [focus, setFocus] = useState<{ shapeId: string }>();
  const [highlightedId, setHighlightedId] = useState<string>();
  const mapRef = useRef<HTMLDivElement>(null);

  const plots = overview.plots ?? [];
  const pagePlotIds = plots.map((plot) => plot.id);
  const filtered = !!(filters.query.search || filters.farm || filters.producer);

  return (
    <section className="mt-8 space-y-5 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <PlotOverviewFiltersBar
        farms={overview.farms}
        filters={filters}
        pickProducer={!ownProducer}
      />
      {overview.queueError && (
        <ErrorState message="No fue posible leer las parcelas guardadas en este dispositivo." />
      )}
      {overview.serverError && (
        <ErrorState
          message="No fue posible cargar las parcelas del servidor. Las guardadas en este dispositivo sí se muestran."
          onRetry={overview.refetch}
        />
      )}
      {overview.serverUnreachable && (
        <p className="font-bold text-muted-foreground" role="status">
          Sin conexión: se muestran solo las parcelas guardadas en este
          dispositivo. Las demás aparecerán al recuperar la conexión.
        </p>
      )}
      {overview.savedAt !== undefined && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          Parcelas guardadas el{' '}
          {formatDateTime(new Date(overview.savedAt).toISOString())}.
        </p>
      )}
      {showMap && !overview.isLoading && (
        <div className="scroll-mt-6" ref={mapRef}>
          <PointsMapPanel
            emptyMessage="Ninguna parcela de esta página tiene polígono para mostrar."
            focus={focus}
            label="Mapa de las parcelas"
            loadProvider={loadPointsMapProvider!}
            onSelectShape={(id) => {
              setHighlightedId(id);
              document
                .getElementById(`plot-${id}-code`)
                ?.closest('article')
                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }}
            points={[]}
            shapes={plotsToShapes(plots)}
          />
        </div>
      )}
      {overview.isLoading ? (
        <div aria-label="Cargando parcelas" role="status">
          <Skeleton className="h-40" />
        </div>
      ) : plots.length ? (
        <>
          {renderSummary?.(pagePlotIds)}
          <PlotList
            highlightedId={highlightedId}
            onShowOnMap={
              showMap
                ? (plot) => {
                    setFocus({ shapeId: plot.id });
                    // La lista está debajo del mapa: se sube hasta él para ver la parcela.
                    mapRef.current?.scrollIntoView({
                      block: 'start',
                      behavior: 'smooth',
                    });
                  }
                : undefined
            }
            plots={plots}
            renderDetails={(plot) => (
              <>
                <PlotFarmLine
                  canOpenProducer={canOpenProducer}
                  farm={plot.farm}
                  farmHref={farmHref}
                  showProducer={!ownProducer}
                />
                {renderPlotDetails?.(plot, pagePlotIds)}
              </>
            )}
          />
        </>
      ) : (
        !overview.serverError &&
        !overview.serverUnreachable &&
        (filtered ? (
          <EmptyState
            title="No hay parcelas que coincidan"
            description="Prueba con otro código, otra finca u otro productor."
          />
        ) : (
          <EmptyState
            title={
              ownProducer
                ? 'Aún no tienes parcelas registradas'
                : 'Aún no hay parcelas registradas'
            }
            description="Las parcelas se registran dentro de una finca, con su código, su área y, si quieres, su polígono."
            action={emptyAction}
          />
        ))
      )}
      {overview.total !== undefined && (
        <Pagination
          label="parcelas"
          onPageChange={filters.setPage}
          page={filters.page}
          pageSize={PLOT_LIST_PAGE_SIZE}
          total={overview.total}
        />
      )}
    </section>
  );
}
