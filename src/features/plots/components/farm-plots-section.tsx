'use client';

import { Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

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
import { plotEditPath, plotNewPath } from '../plot-paths';
import { useKnownPlots } from '../use-known-plots';
import { useRefreshPlotsWhenQueueShrinks } from '../use-plot-queue';
import { PLOT_DELETED_CODE } from '../sync-adapter';
import { PlotAreaBar } from './plot-area-bar';
import { PlotDeleteDialog } from './plot-delete-dialog';
import { PlotDiscardDialog } from './plot-discard-dialog';
import { PlotList } from './plot-list';
import { PlotStatusDialog } from './plot-status-dialog';

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
}: {
  farm: PlotsFarm;
  // Ver `PlotList`: lo que otro dominio agrega a cada parcela.
  renderPlotDetails?: (plot: KnownPlot) => React.ReactNode;
}) {
  const { data: user } = useSession();
  const canView = hasPermission(user, PERMISSIONS.PLOTS_VIEW);
  const canAdd = hasPermission(user, PERMISSIONS.PLOTS_ADD);
  const canChange = hasPermission(user, PERMISSIONS.PLOTS_CHANGE);
  const canDeletePlot = hasPermission(user, PERMISSIONS.PLOTS_DELETE);
  const known = useKnownPlots(farm.id, { fromServer: !farm.isPendingCreate });
  // Cuando una parcela sale de la cola se sincronizó: la lista y el área asignada se vuelven a
  // pedir para que aparezca con los datos del servidor.
  useRefreshPlotsWhenQueueShrinks(farm.id, known.queuedPlots);
  // Cada pedido es un objeto nuevo: pedir dos veces la misma parcela vuelve a llevar el mapa.
  const [focus, setFocus] = useState<{ shapeId: string }>();
  const mapRef = useRef<HTMLDivElement>(null);

  // La asociación consulta fincas y no llega más allá.
  if (!canView) return null;

  // Registrar parcelas en una finca inactiva no se puede: sus parcelas quedan congeladas.
  const registerLink = canAdd && farm.isActive && (
    <Link
      className={buttonVariants({ size: 'office' })}
      href={plotNewPath(farm.id)}
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar parcela
    </Link>
  );

  const renderActions = (plot: KnownPlot) => {
    const isError = plot.queue?.status === 'error';
    // La parcela (o su finca) ya no existe en el servidor: corregirla no sirve, solo descartarla.
    const canCorrect = plot.queue?.errorCode !== PLOT_DELETED_CODE;
    const label = isError ? 'Corregir' : 'Editar';
    const showEdit =
      farm.isActive &&
      canCorrect &&
      // Una parcela que solo está en el dispositivo se corrige con el permiso de registrar; una
      // del servidor, con el de editar.
      (plot.queue?.operation === 'create' ? canAdd : canChange);
    // Activar, desactivar y eliminar son en línea y sobre la versión del servidor: no se ofrecen
    // mientras la parcela tenga algo pendiente en el dispositivo.
    const serverPlot =
      !plot.queue && plot.version !== undefined
        ? { ...plot, version: plot.version }
        : null;
    const canDeactivate = serverPlot && canChange && farm.isActive;
    const canDelete = serverPlot && canDeletePlot && farm.isActive;
    if (!showEdit && !isError && !canDeactivate && !canDelete) return null;
    return (
      <>
        {showEdit && (
          <Link
            aria-label={`${label} ${plot.code}`}
            className={buttonVariants({ size: 'office', variant: 'outline' })}
            href={plotEditPath(plot.id, farm.id)}
          >
            <Pencil aria-hidden="true" className="size-4" /> {label}
          </Link>
        )}
        {/* Descartar solo cuando falló: una pendiente todavía puede llegar bien. */}
        {isError && <PlotDiscardDialog code={plot.code} plotId={plot.id} />}
        {canDeactivate && (
          <PlotStatusDialog farmId={farm.id} plot={serverPlot} />
        )}
        {canDelete && <PlotDeleteDialog farmId={farm.id} plot={serverPlot} />}
      </>
    );
  };

  return (
    <section
      aria-labelledby="plots-heading"
      className="mt-6 space-y-5 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="plots-heading" className="text-2xl text-selva">
          Parcelas de esta finca
          {known.plots ? ` · ${known.plots.length}` : ''}
        </h2>
        {known.plots && known.plots.length > 0 && registerLink}
      </div>
      {farm.allocatedAreaHectares !== undefined && (
        <PlotAreaBar
          allocatedAreaHectares={farm.allocatedAreaHectares}
          areaHectares={farm.areaHectares}
        />
      )}
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
            // La lista está debajo del mapa: se sube hasta él para ver la parcela.
            mapRef.current?.scrollIntoView({
              block: 'start',
              behavior: 'smooth',
            });
          }}
          plots={known.plots}
          registerLink={registerLink}
          renderActions={renderActions}
          renderPlotDetails={renderPlotDetails}
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
      <div className="scroll-mt-6" ref={mapRef}>
        <PointsMapPanel
          emptyMessage="La finca no tiene ubicación para mostrar en el mapa."
          focus={focus}
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
      {hasMore && (
        <p className="font-bold text-warn" role="status">
          Esta finca tiene más parcelas de las que se muestran aquí.
        </p>
      )}
      {plots.length ? (
        <PlotList
          onShowOnMap={(plot) => onShowOnMap(plot.id)}
          plots={plots}
          renderActions={renderActions}
          renderDetails={renderPlotDetails}
        />
      ) : (
        <EmptyState
          title="Esta finca aún no tiene parcelas"
          description="Registra la primera con su código, su área y, si quieres, su polígono. Puedes hacerlo sin conexión."
          action={registerLink || undefined}
        />
      )}
    </>
  );
}
