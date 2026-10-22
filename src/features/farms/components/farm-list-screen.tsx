'use client';

import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

import { EditorLink } from '@/components/editor-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FarmHills } from '@/components/illustrations/farm-hills';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { PAGE_SIZE, useFarms } from '../api';
import {
  type FarmListItem,
  mergeFarmLists,
  searchFarms,
} from '../farm-list-item';
import { useFarmFilters } from '../use-farm-filters';
import { useFarmMapMode } from '../use-farm-map-mode';
import { useLocalFarms } from '../use-local-farms';
import { FarmCardList } from './farm-card-list';
import { FarmFiltersBar } from './farm-filters-bar';
import { FarmCardActions } from './farm-card-actions';
import { FarmsMap } from './farms-map';
import { pageContainerClass } from '@/components/page-container';
import { LoadingBlock } from '@/components/loading-block';

const isQueued = (farm: FarmListItem) =>
  farm.status === 'pending' || farm.status === 'error';

export function FarmListScreen() {
  const { data: user } = useSession();
  const filters = useFarmFilters();
  const list = useFarms(filters.query);
  const local = useLocalFarms(user?.id);
  const municipalityName = useMunicipalityName();
  const canAdd = hasPermission(user, PERMISSIONS.FARMS_ADD);
  const canChange = hasPermission(user, PERMISSIONS.FARMS_CHANGE);
  const canPickProducer = hasPermission(user, PERMISSIONS.PRODUCERS_VIEW);
  // Estado de la interfaz, no del servidor: qué finca enfocar en el mapa y qué tarjeta resaltar.
  const [focus, setFocus] = useState<{ pointId: string }>();
  const [highlightedId, setHighlightedId] = useState<string>();
  const mapRef = useRef<HTMLDivElement>(null);
  const isAssociation = !user?.producer_id;
  const mapMode = useFarmMapMode(isAssociation);
  // La asociación mirando a todos los productores necesita saber de quién es cada finca.
  const showProducer = isAssociation && !filters.producer;

  const farms = mergeFarmLists(local.farms ?? [], list.data?.results ?? [], {
    search: filters.query.search,
    municipality: filters.municipality,
  });

  // Sin conexión se muestra lo del dispositivo en vez de un esqueleto sin fin.
  const serverUnreachable = isPausedWithoutData(list);
  const isLoading =
    (list.isPending && !list.isLoadingError && !serverUnreachable) ||
    (!local.farms && !local.isError);
  const hasError = list.isLoadingError || local.isError;

  const renderActions = (farm: FarmListItem) =>
    (isQueued(farm) ? canAdd || canChange : canChange) && (
      <FarmCardActions farm={farm} />
    );

  const emptyState = (
    <FarmListEmpty
      filtered={
        !!(filters.query.search || filters.municipality || filters.producer)
      }
      canAdd={canAdd}
      isAssociation={isAssociation}
    />
  );

  return (
    <div className={pageContainerClass('wide')}>
      <FarmListHeader
        canAdd={canAdd}
        canAddPlot={hasPermission(user, PERMISSIONS.PLOTS_ADD)}
        isAssociation={isAssociation}
      />
      <section className="mt-5 space-y-4 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
        <FarmFiltersBar
          filters={filters}
          pickProducer={isAssociation && canPickProducer}
        />
        {local.isError && (
          <ErrorState message="No fue posible leer las fincas guardadas en este dispositivo." />
        )}
        {list.isLoadingError && (
          <ErrorState
            message={
              isAssociation
                ? 'No fue posible cargar las fincas del servidor.'
                : 'No fue posible cargar tus fincas del servidor. Las guardadas en este dispositivo sí se muestran.'
            }
            onRetry={() => void list.refetch()}
          />
        )}
        <div className="scroll-mt-6" ref={mapRef}>
          {!isLoading && (
            <FarmsMap
              focus={focus}
              mode={mapMode.mode}
              onModeChange={mapMode.setMode}
              localFarms={searchFarms(local.farms ?? [], filters.query.search)}
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
          <LoadingBlock
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            label="Cargando fincas"
            shapes={['h-40', 'h-40']}
          />
        ) : farms.length ? (
          <FarmCardList
            farms={farms}
            canOpenProducer={canPickProducer}
            highlightedId={highlightedId}
            showProducer={isAssociation}
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

// La lista vacía: por los filtros, porque la asociación aún no tiene fincas, o porque el productor
// todavía no registra la primera.
function FarmListEmpty({
  filtered,
  isAssociation,
  canAdd,
}: {
  filtered: boolean;
  isAssociation: boolean;
  canAdd: boolean;
}) {
  if (filtered) {
    return (
      <EmptyState
        description={
          isAssociation
            ? 'Prueba con otro nombre, municipio o productor.'
            : 'Prueba con otro nombre o con otro municipio.'
        }
        illustration={FarmHills}
        title="No hay fincas que coincidan"
      />
    );
  }
  if (isAssociation) {
    return (
      <EmptyState
        description="Las fincas que registren los productores aparecerán aquí."
        illustration={FarmHills}
        title="Aún no hay fincas registradas"
      />
    );
  }
  return (
    <EmptyState
      action={canAdd && <RegisterFarmLink />}
      description="Registra tu primera finca con su ubicación. Puedes hacerlo sin conexión."
      illustration={FarmHills}
      title="Aún no tienes fincas registradas"
    />
  );
}

function RegisterFarmLink() {
  return (
    <EditorLink
      className={buttonVariants({ size: 'office' })}
      href="/fincas/nueva"
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar finca
    </EditorLink>
  );
}

// La asociación consulta las fincas de todos; el productor, las suyas. Quien no tiene un productor
// propio (la cuenta técnica) registra parcelas en fincas de muchos: el atajo le ahorra abrir antes
// la finca. Un productor llega desde la suya.
function FarmListHeader({
  isAssociation,
  canAdd,
  canAddPlot,
}: {
  isAssociation: boolean;
  canAdd: boolean;
  canAddPlot: boolean;
}) {
  const plotShortcut = isAssociation && canAddPlot;
  return (
    <PageHeader
      accent="hoja"
      actions={
        canAdd || plotShortcut ? (
          <>
            {plotShortcut && (
              <EditorLink
                className={buttonVariants({
                  size: 'office',
                  variant: 'outline',
                })}
                href="/fincas/parcelas/nueva"
              >
                <Plus aria-hidden="true" className="size-5" /> Registrar parcela
              </EditorLink>
            )}
            {canAdd && <RegisterFarmLink />}
          </>
        ) : undefined
      }
      description={
        isAssociation
          ? 'Consulta las fincas de los productores de la asociación.'
          : 'Consulta tus fincas y su estado de sincronización.'
      }
      eyebrow="Gestión de fincas"
      title={isAssociation ? 'Fincas' : 'Mis fincas'}
      tone="selva"
    />
  );
}
