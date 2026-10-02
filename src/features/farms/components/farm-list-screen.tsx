'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { matchesSearch } from '@/lib/format/search';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { PAGE_SIZE, useFarms } from '../api';
import { type FarmListItem, serverFarmToListItem } from '../farm-list-item';
import { useFarmFilters } from '../use-farm-filters';
import { useFarmMapMode } from '../use-farm-map-mode';
import {
  useLocalFarms,
  useRefreshFarmsWhenQueueShrinks,
} from '../use-local-farms';
import { FarmCardList } from './farm-card-list';
import { FarmFiltersBar } from './farm-filters-bar';
import { FarmQueueActions } from './farm-queue-actions';
import { FarmServerActions } from './farm-server-actions';
import { FarmsMap } from './farms-map';

const isQueued = (farm: FarmListItem) =>
  farm.status === 'pending' || farm.status === 'error';

export function FarmListScreen() {
  const { data: user } = useSession();
  const filters = useFarmFilters();
  const list = useFarms(filters.query);
  const local = useLocalFarms(user?.id);
  useRefreshFarmsWhenQueueShrinks(local.farms);
  const municipalityName = useMunicipalityName();
  const canAdd = hasPermission(user, PERMISSIONS.FARMS_ADD);
  const canChange = hasPermission(user, PERMISSIONS.FARMS_CHANGE);
  // Estado de la interfaz, no del servidor: qué finca enfocar en el mapa y qué tarjeta resaltar.
  const [focus, setFocus] = useState<{ pointId: string }>();
  const [highlightedId, setHighlightedId] = useState<string>();
  const mapRef = useRef<HTMLDivElement>(null);
  const isAssociation = !user?.producer_id;
  const mapMode = useFarmMapMode(isAssociation);
  // La asociación mirando a todos los productores necesita saber de quién es cada finca.
  const showProducer = isAssociation && !filters.producer;

  // Lo que está en el dispositivo va primero (necesita atención o aún no llega) y reemplaza a su
  // copia del servidor: una edición pendiente muestra los datos nuevos, no los viejos.
  const searchedLocalFarms = (local.farms ?? []).filter((farm) =>
    matchesSearch(
      [farm.name, municipalityName(farm.municipalityCode), farm.details],
      filters.query.search ?? '',
    ),
  );
  const localFarms = searchedLocalFarms.filter(
    (farm) =>
      !filters.municipality || farm.municipalityCode === filters.municipality,
  );
  const localIds = new Set(local.farms?.map((farm) => farm.id));
  const serverFarms = (list.data?.results ?? [])
    .filter((farm) => !localIds.has(farm.id))
    .map(serverFarmToListItem);
  const farms = [...localFarms, ...serverFarms];

  // Sin conexión la consulta al servidor queda en pausa hasta que vuelva la red: no es una
  // carga en curso, así que se muestra lo del dispositivo en vez de un esqueleto sin fin.
  const serverUnreachable = list.isPending && list.fetchStatus === 'paused';
  const isLoading =
    (list.isPending && !list.isLoadingError && !serverUnreachable) ||
    (!local.farms && !local.isError);
  const hasError = list.isLoadingError || local.isError;

  const registerLink = canAdd && (
    <Link className={buttonVariants({ size: 'office' })} href="/fincas/nueva">
      <Plus aria-hidden="true" className="size-5" /> Registrar finca
    </Link>
  );

  const renderActions = (farm: FarmListItem) =>
    isQueued(farm)
      ? (canAdd || canChange) && <FarmQueueActions farm={farm} />
      : canChange && <FarmServerActions farm={farm} />;

  const emptyState =
    filters.query.search || filters.municipality ? (
      <EmptyState
        title="No hay fincas que coincidan"
        description="Prueba con otro nombre, municipio o vereda."
      />
    ) : (
      <EmptyState
        title="Aún no tienes fincas registradas"
        description="Registra tu primera finca con su ubicación. Puedes hacerlo sin conexión."
        action={registerLink}
      />
    );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Gestión de fincas"
        title="Mis fincas"
        description="Consulta tus fincas y su estado de sincronización."
        actions={registerLink}
      />
      <section className="mt-8 space-y-5 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
        <FarmFiltersBar filters={filters} />
        {local.isError && (
          <ErrorState message="No fue posible leer las fincas guardadas en este dispositivo." />
        )}
        {list.isLoadingError && (
          <ErrorState
            message="No fue posible cargar tus fincas del servidor. Las guardadas en este dispositivo sí se muestran."
            onRetry={() => void list.refetch()}
          />
        )}
        <div className="scroll-mt-6" ref={mapRef}>
          {!isLoading && (
            <FarmsMap
              focus={focus}
              mode={mapMode.mode}
              onModeChange={mapMode.setMode}
              localFarms={searchedLocalFarms}
              municipality={filters.municipality}
              municipalityName={municipalityName}
              onMunicipalityChange={(code) =>
                void filters.setMunicipality(code)
              }
              onSelectFarm={(id) => {
                setHighlightedId(id);
                document
                  .getElementById(`farm-${id}-name`)
                  ?.closest('article')
                  ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }}
              query={{
                search: filters.query.search,
                producer: filters.query.producer,
              }}
              showProducer={showProducer}
              userId={user?.id}
            />
          )}
        </div>
        {serverUnreachable && (
          <p className="font-bold text-muted-foreground" role="status">
            Sin conexión: se muestran solo las fincas guardadas en este
            dispositivo. Las demás aparecerán al recuperar la conexión.
          </p>
        )}
        {isLoading ? (
          <div
            aria-label="Cargando fincas"
            className="grid gap-4 md:grid-cols-2"
            role="status"
          >
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : farms.length ? (
          <FarmCardList
            farms={farms}
            highlightedId={highlightedId}
            municipalityName={municipalityName}
            onShowOnMap={(farm) => {
              // Por municipios hay que entrar al suyo; el mapa libre ya la tiene a la vista.
              if (mapMode.mode === 'municipalities') {
                void filters.setMunicipality(farm.municipalityCode);
              }
              setFocus({ pointId: farm.id });
              // La tarjeta está debajo del mapa: se sube hasta él para ver la finca.
              mapRef.current?.scrollIntoView({
                block: 'start',
                behavior: 'smooth',
              });
            }}
            renderActions={renderActions}
          />
        ) : (
          !hasError && !serverUnreachable && emptyState
        )}
        {list.data && (
          <Pagination
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={list.data.count}
            onPageChange={filters.setPage}
            label="fincas"
          />
        )}
      </section>
    </div>
  );
}
