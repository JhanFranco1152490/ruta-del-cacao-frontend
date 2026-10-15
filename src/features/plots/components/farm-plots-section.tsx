'use client';

import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

import { EditorLink } from '@/components/editor-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PointsMapPanel } from '@/components/map/points-map-panel';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { loadPointsMapProvider } from '@/config/map';
import { useSession } from '@/hooks/use-session';
import { formatDateTime } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Coordinates } from '@/types/geo';

import type { KnownPlot } from '../known-plots';
import { plotsToShapes } from '../plot-map';
import { plotNewPath } from '../plot-paths';
import { useKnownPlots } from '../use-known-plots';
import { PlotAreaBar } from './plot-area-bar';
import { PlotCardActions } from './plot-card-actions';
import { PlotList } from './plot-list';

// Lo mismo que entrega la pantalla de la finca, escrito aquí para no importar del dominio de
// fincas.
type PlotsFarm = {
  id: string;
  name: string;
  areaHectares: string;
  allocatedAreaHectares?: string;
  location: Coordinates;
  isActive: boolean;
  // Todavía no existe en el servidor: no tiene parcelas allá, solo las que esperan en el
  // dispositivo.
  isPendingCreate?: boolean;
};

const toNumber = (value: string) => Number(value.trim().replace(',', '.'));

export function FarmPlotsSection({
  farm,
  renderPlotDetails,
  renderPlotShortcuts,
}: {
  farm: PlotsFarm;
  // Ver `PlotList`: lo que otro dominio agrega a cada parcela.
  renderPlotDetails?: (plot: KnownPlot) => React.ReactNode;
  renderPlotShortcuts?: (plot: KnownPlot) => React.ReactNode;
}) {
  const { data: user } = useSession();
  const canView = hasPermission(user, PERMISSIONS.PLOTS_VIEW);
  const canAdd = hasPermission(user, PERMISSIONS.PLOTS_ADD);
  const known = useKnownPlots(farm.id, { fromServer: !farm.isPendingCreate });
  // Cuando una parcela sale de la cola se sincronizó: la lista y el área asignada se vuelven a
  // pedir para que aparezca con los datos del servidor.
  // Cada pedido es un objeto nuevo: pedir dos veces la misma parcela vuelve a llevar el mapa.
  const [focus, setFocus] = useState<{ shapeId: string }>();
  const mapRef = useRef<HTMLDivElement>(null);

  // La asociación consulta fincas y no llega más allá.
  if (!canView) return null;

  // Registrar parcelas en una finca inactiva no se puede: sus parcelas quedan congeladas.
  const registerLink = canAdd && farm.isActive && (
    <EditorLink
      className={buttonVariants({ size: 'office' })}
      href={plotNewPath(farm.id)}
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar parcela
    </EditorLink>
  );

  const renderActions = (plot: KnownPlot) => (
    <PlotCardActions farm={farm} plot={plot} />
  );

  return (
    <section
      aria-labelledby="plots-heading"
      className="mt-5 space-y-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 id="plots-heading" className="text-2xl text-selva">
          Parcelas de esta finca
          {known.plots ? ` · ${known.plots.length}` : ''}
        </h2>
        {farm.allocatedAreaHectares !== undefined && (
          <div className="min-w-64 flex-1 sm:max-w-xl">
            <PlotAreaBar
              allocatedAreaHectares={farm.allocatedAreaHectares}
              areaHectares={farm.areaHectares}
            />
          </div>
        )}
        {known.plots && known.plots.length > 0 && (
          <div className="ml-auto">{registerLink}</div>
        )}
      </div>
      {known.isLoading && (
        <div aria-label="Cargando parcelas" role="status">
          <Skeleton className="h-64" />
        </div>
      )}
      {known.isError && (
        <ErrorState message="No fue posible leer las parcelas guardadas en este dispositivo." />
      )}
      {known.serverUnavailable && !known.isLoading && (
        <ErrorState
          message="No fue posible cargar las parcelas del servidor. Si no las has abierto antes con conexión, necesitas conexión para verlas."
          onRetry={known.refetchServer}
        />
      )}
      {known.plots && !known.isLoading && (
        <PlotsContent
          farm={farm}
          focus={focus}
          hasMore={known.hasMore}
          mapRef={mapRef}
          onShowOnMap={(shapeId) => {
            setFocus({ shapeId });
            // En el celular el mapa está arriba de la lista: se sube hasta él para ver la parcela.
            // Si ya está a la vista (pantallas anchas) no se mueve nada.
            mapRef.current?.scrollIntoView({
              block: 'nearest',
              behavior: 'smooth',
            });
          }}
          plots={known.plots}
          registerLink={registerLink}
          renderActions={renderActions}
          renderPlotDetails={renderPlotDetails}
          renderPlotShortcuts={renderPlotShortcuts}
          savedAt={known.savedAt}
        />
      )}
    </section>
  );
}

function PlotsContent({
  farm,
  plots,
  hasMore,
  savedAt,
  focus,
  mapRef,
  registerLink,
  renderActions,
  renderPlotDetails,
  renderPlotShortcuts,
  onShowOnMap,
}: {
  farm: PlotsFarm;
  plots: readonly KnownPlot[];
  hasMore: boolean;
  savedAt?: number;
  focus?: { shapeId: string };
  mapRef: React.RefObject<HTMLDivElement | null>;
  registerLink: React.ReactNode;
  renderActions: (plot: KnownPlot) => React.ReactNode;
  renderPlotDetails?: (plot: KnownPlot) => React.ReactNode;
  renderPlotShortcuts?: (plot: KnownPlot) => React.ReactNode;
  onShowOnMap: (shapeId: string) => void;
}) {
  const shapes = plotsToShapes(plots);
  const farmPoint = {
    latitude: toNumber(farm.location.latitude),
    longitude: toNumber(farm.location.longitude),
  };

  return (
    <>
      {savedAt !== undefined && (
        <p className="text-sm font-bold text-muted-foreground" role="status">
          Parcelas guardadas el{' '}
          {formatDateTime(new Date(savedAt).toISOString())}.
        </p>
      )}
      {hasMore && (
        <p className="font-bold text-warn" role="status">
          Esta finca tiene más parcelas de las que se muestran aquí.
        </p>
      )}
      {/* Con espacio, las parcelas van junto al mapa y este se queda a la vista mientras se
          recorre la lista; en el celular, la lista primero y el mapa plegado arriba. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-start">
        <div
          className="scroll-mt-6 lg:sticky lg:top-20 lg:order-2"
          ref={mapRef}
        >
          <PointsMapPanel
            emptyMessage="La finca no tiene ubicación para mostrar en el mapa."
            focus={focus}
            heightClassName="h-64 lg:h-[min(32rem,calc(100dvh-7rem))]"
            hiddenOnMobile
            label="Mapa de la finca y sus parcelas"
            loadProvider={loadPointsMapProvider!}
            points={[
              {
                id: farm.id,
                label: farm.name,
                detail: 'Punto de la finca',
                position: farmPoint,
                tone: 'ok',
              },
            ]}
            shapes={shapes}
          />
        </div>
        <div className="lg:order-1">
          {plots.length ? (
            <PlotList
              className="grid-cols-1 2xl:grid-cols-2"
              onShowOnMap={(plot) => onShowOnMap(plot.id)}
              plots={plots}
              renderActions={renderActions}
              renderDetails={renderPlotDetails}
              renderShortcuts={renderPlotShortcuts}
            />
          ) : (
            <EmptyState
              title="Esta finca aún no tiene parcelas"
              description="Registra la primera con su código, su área y, si quieres, su polígono. Puedes hacerlo sin conexión."
              action={registerLink || undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}
