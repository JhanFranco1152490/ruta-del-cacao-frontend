'use client';

import { useRef, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PointsMapPanel } from '@/components/map/points-map-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { loadPointsMapProvider } from '@/config/map';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Coordinates } from '@/types/geo';

import { useFarmPlots } from '../api';
import { plotsToShapes } from '../plot-map';
import { PlotAreaBar } from './plot-area-bar';
import { PlotList } from './plot-list';

// Lo mismo que entrega la pantalla de la finca, escrito aquí para no importar del dominio de
// fincas.
type PlotsFarm = {
  id: string;
  name: string;
  areaHectares: string;
  allocatedAreaHectares?: string;
  location: Coordinates;
};

const toNumber = (value: string) => Number(value.trim().replace(',', '.'));

export function FarmPlotsSection({ farm }: { farm: PlotsFarm }) {
  const { data: user } = useSession();
  const canView = hasPermission(user, PERMISSIONS.PLOTS_VIEW);
  const plots = useFarmPlots(user?.id, farm.id, { enabled: canView });
  // Cada pedido es un objeto nuevo: pedir dos veces la misma parcela vuelve a llevar el mapa.
  const [focus, setFocus] = useState<{ shapeId: string }>();
  const mapRef = useRef<HTMLDivElement>(null);

  // La asociación consulta fincas y no llega más allá.
  if (!canView) return null;

  return (
    <section
      aria-labelledby="plots-heading"
      className="mt-6 space-y-5 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
    >
      <h2 id="plots-heading" className="text-2xl text-selva">
        Parcelas de esta finca
        {plots.data ? ` · ${plots.data.data.plots.length}` : ''}
      </h2>
      {farm.allocatedAreaHectares !== undefined && (
        <PlotAreaBar
          allocatedAreaHectares={farm.allocatedAreaHectares}
          areaHectares={farm.areaHectares}
        />
      )}
      {plots.isPending && (
        <div aria-label="Cargando parcelas" role="status">
          <Skeleton className="h-64" />
        </div>
      )}
      {plots.isError && (
        <ErrorState
          message={
            isApiError(plots.error) && plots.error.status === 404
              ? 'No encontramos las parcelas de esta finca.'
              : 'No fue posible cargar las parcelas. Si no las has abierto antes con conexión, necesitas conexión para verlas.'
          }
          onRetry={() => void plots.refetch()}
        />
      )}
      {plots.data && (
        <PlotsContent
          farm={farm}
          focus={focus}
          hasMore={plots.data.data.hasMore}
          mapRef={mapRef}
          onShowOnMap={(shapeId) => {
            setFocus({ shapeId });
            // La lista está debajo del mapa: se sube hasta él para ver la parcela.
            mapRef.current?.scrollIntoView({
              block: 'start',
              behavior: 'smooth',
            });
          }}
          plots={plots.data.data.plots}
          savedAt={plots.data.savedAt}
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
  onShowOnMap,
}: {
  farm: PlotsFarm;
  plots: Parameters<typeof PlotList>[0]['plots'];
  hasMore: boolean;
  savedAt?: number;
  focus?: { shapeId: string };
  mapRef: React.RefObject<HTMLDivElement | null>;
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
        <PlotList onShowOnMap={(plot) => onShowOnMap(plot.id)} plots={plots} />
      ) : (
        <EmptyState
          title="Esta finca aún no tiene parcelas"
          description="Cuando registres parcelas, aparecerán aquí con su polígono en el mapa."
        />
      )}
    </>
  );
}
