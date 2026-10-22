'use client';

import { type ReactNode, useRef, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PlotOutline } from '@/components/illustrations/plot-outline';
import { MapBesideList } from '@/components/map/map-beside-list';
import { PointsMapPanel } from '@/components/map/points-map-panel';
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { loadPointsMapProvider } from '@/config/map';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { PLOT_LIST_PAGE_SIZE } from '../api';
import { sectionPlots } from '../plot-groups';
import type { OverviewPlot } from '../plot-overview';
import { plotsToShapes } from '../plot-map';
import { usePlotFilters } from '../use-plot-filters';
import { usePlotOverview } from '../use-plot-overview';
import { PlotCardActions } from './plot-card-actions';
import { PlotCharacterizationProgress } from './plot-characterization-progress';
import { PlotFarmLine } from './plot-farm-line';
import { PlotList } from './plot-list';
import {
  PlotGroupingControl,
  PlotOverviewFiltersBar,
} from './plot-overview-filters-bar';
import { PlotSections } from './plot-sections';

// Lo que otro dominio agrega a cada tarjeta (la ficha agronómica, con sus acciones). Recibe los
// ids de la página para pedir lo suyo en una sola consulta.
export type RenderPlotDetails = (
  plot: OverviewPlot,
  pagePlotIds: readonly string[],
) => ReactNode;

// Las parcelas de todas las fincas: filtros, contador de caracterización, mapa y tarjetas
// agrupadas, cada una con todo lo que se puede hacer con ella.
export function PlotOverview({
  farmHref,
  renderPlotDetails,
  failedPlotIds,
  emptyAction,
}: {
  // A dónde lleva el nombre de la finca: la pantalla de otro dominio, que entrega la página.
  farmHref?: (farmId: string) => string;
  renderPlotDetails?: RenderPlotDetails;
  // Las parcelas cuya ficha falló en el dispositivo (otro dominio), para el filtro "Con error".
  failedPlotIds?: readonly string[];
  emptyAction?: ReactNode;
}) {
  const { data: user } = useSession();
  const ownProducer = !!user?.producer_id;
  const filters = usePlotFilters({ ownProducer });
  const overview = usePlotOverview(filters, { failedPlotIds });
  const canOpenProducer = hasPermission(user, PERMISSIONS.PRODUCERS_VIEW);
  // Estado de la interfaz, no del servidor: qué parcela enfocar en el mapa y qué tarjeta resaltar.
  const [focus, setFocus] = useState<{ shapeId: string }>();
  const [highlightedId, setHighlightedId] = useState<string>();
  const mapRef = useRef<HTMLDivElement>(null);

  const plots = overview.plots ?? [];
  const pagePlotIds = plots.map((plot) => plot.id);
  const before = overview.before && {
    farm: {
      id: overview.before.farm.id,
      name: overview.before.farm.name,
      isActive: overview.before.farm.is_active,
      producer: overview.before.farm.producer,
    },
  };
  const sections = sectionPlots(plots, filters.grouping, {
    byProducer: !ownProducer,
    before,
  });

  const showOnMap = (plot: OverviewPlot) => {
    setFocus({ shapeId: plot.id });
    // En el celular el mapa está arriba de la lista: se sube hasta él para ver la parcela. Con ancho
    // ya está a la vista y no se mueve nada.
    mapRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <section className="mt-5 space-y-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5">
      <PlotOverviewFiltersBar
        filters={filters}
        pickProducer={!ownProducer}
        leading={
          <PlotGroupingControl filters={filters} pickProducer={!ownProducer} />
        }
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
      <MapBesideList
        list={(mapVisible) => (
          <div className="space-y-3">
            {overview.isLoading ? (
              <div aria-label="Cargando parcelas" role="status">
                <Skeleton className="h-40" />
              </div>
            ) : plots.length ? (
              <PlotSections
                farmHref={farmHref}
                renderList={(groupPlots) => {
                  const headers =
                    sections.find((section) => section.plots === groupPlots)
                      ?.headers ?? [];
                  const hasHeader = (level: string) =>
                    headers.some((header) => header.level === level);
                  return (
                    <PlotList
                      className={
                        mapVisible
                          ? 'grid-cols-1 2xl:grid-cols-2'
                          : 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3'
                      }
                      highlightedId={highlightedId}
                      label={labelOf(sections, groupPlots)}
                      onShowOnMap={showOnMap}
                      plots={groupPlots}
                      renderActions={(plot, card) => (
                        <PlotCardActions
                          compact={card.compact}
                          farm={plot.farm}
                          onShowOnMap={card.showOnMap}
                          plot={plot}
                        />
                      )}
                      renderDetails={(plot) => (
                        <>
                          <PlotFarmLine
                            canOpenProducer={canOpenProducer}
                            farm={plot.farm}
                            farmHref={farmHref}
                            showFarm={!hasHeader('farm')}
                            showProducer={
                              !ownProducer &&
                              (filters.grouping === 'ninguno' ||
                                hasHeader('device'))
                            }
                          />
                          {renderPlotDetails?.(plot, pagePlotIds)}
                        </>
                      )}
                    />
                  );
                }}
                sections={sections}
              />
            ) : (
              !overview.serverError &&
              !overview.serverUnreachable &&
              (filters.filtered ? (
                <EmptyState
                  illustration={PlotOutline}
                  title="No hay parcelas que coincidan"
                  description="Prueba con otro código, otra finca, otro productor u otra caracterización."
                />
              ) : (
                <EmptyState
                  illustration={PlotOutline}
                  title={
                    ownProducer
                      ? 'Aún no tienes parcelas registradas'
                      : 'Aún no hay parcelas registradas'
                  }
                  description="Las parcelas se registran dentro de una finca, con su área y, si quieres, su nombre y su polígono."
                  action={emptyAction}
                />
              ))
            )}
          </div>
        )}
        map={(visibility) =>
          !overview.isLoading && (
            <PointsMapPanel
              emptyMessage="Ninguna parcela de esta página tiene polígono para mostrar."
              focus={focus}
              heightClassName="h-64 lg:h-[min(32rem,calc(100dvh-7rem))]"
              hiddenOnMobile
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
              toolbar={
                overview.counts && (
                  <PlotCharacterizationProgress
                    done={overview.counts.done}
                    pending={overview.counts.pending}
                  />
                )
              }
              visibility={visibility}
            />
          )
        }
        mapRef={mapRef}
      />
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

// El nombre de cada lista es el de su grupo: con varias en la pantalla, se distinguen.
function labelOf(
  sections: ReturnType<typeof sectionPlots>,
  plots: readonly OverviewPlot[],
) {
  const section = sections.find((item) => item.plots === plots);
  const header = section?.headers.at(-1);
  return header ? `Parcelas de ${header.label}` : 'Parcelas';
}
