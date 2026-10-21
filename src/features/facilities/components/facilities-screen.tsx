'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useProducerSummary } from '@/lib/api/producer-options';
import { farmLabel } from '@/lib/format/place-label';
import { isNeverLoaded } from '@/lib/offline/paused-read';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type PostharvestFacility, useFacilities } from '../api';
import { type FacilityActionKind, facilityActions } from '../facility-actions';
import { useFacilityFarm } from '../use-facility-farm';
import { useFacilityFilters } from '../use-facility-filters';
import {
  FacilityDialogs,
  type PendingFacilityAction,
} from './facility-dialogs';
import { FacilityFarmSelect } from './facility-farm-select';
import { FacilityList } from './facility-list';
import { FacilityOfflineNotice } from './facility-offline-notice';
import { pageContainerClass } from '@/components/page-container';

const NEEDS_CONNECTION =
  'Necesitas conexión una vez para cargar la infraestructura.';

const Loading = () => (
  <div
    aria-label="Cargando infraestructura"
    className="space-y-3"
    role="status"
  >
    <Skeleton className="h-28" />
    <Skeleton className="h-64" />
  </div>
);

// Infraestructura: los cajones y marquesinas de una finca a la vez (la última que se vio, o la
// primera), con un selector para cambiar de finca; la cuenta técnica elige antes el productor. Sin conexión muestra la última copia guardada en el dispositivo. La ficha del
// lote es de otro dominio: la ruta la entrega quien monta la pantalla.
export function FacilitiesScreen({
  lotHref,
}: {
  lotHref: (id: string) => string;
}) {
  const { data: user } = useSession();
  const router = useRouter();
  const superuser = user?.is_superuser === true;
  const hasConnection = useHasConnection();
  const state = useFacilityFilters();
  // La cuenta técnica elige el productor; las demás ven el suyo.
  const producer = superuser ? state.producer : null;
  const read = useFacilities(user?.id, producer, {
    enabled: !superuser || !!producer,
  });
  const known = read.data?.data;
  const elementFarm =
    known?.find(({ id }) => id === state.element)?.farm.id ?? null;
  const place = useFacilityFarm(user?.id, superuser, elementFarm);
  const { resolution, farm } = place;
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const [pending, setPending] = useState<PendingFacilityAction>();

  const savedAt = read.data?.savedAt;
  const offline = !hasConnection || savedAt !== undefined;
  const canViewLots = hasPermission(user, PERMISSIONS.LOTS_VIEW);
  // Sin el permiso de lotes, o sin conexión (la ficha del lote es en línea), el lote se nombra pero
  // no se enlaza.
  const visibleLotHref = canViewLots && !offline ? lotHref : undefined;
  const permissions = {
    canChange: hasPermission(user, PERMISSIONS.FACILITIES_CHANGE),
    canDelete: hasPermission(user, PERMISSIONS.FACILITIES_DELETE),
    canViewLots,
  };
  const actionsOf = (facility: PostharvestFacility) =>
    facilityActions(facility, permissions);
  const onAction = (
    kind: FacilityActionKind,
    facility: PostharvestFacility,
  ) => {
    const lot = facility.occupied_by?.lot;
    if (kind === 'view-lot') {
      if (lot) router.push(lotHref(lot.id));
      return;
    }
    setPending({ kind, facility });
  };
  const register = hasPermission(user, PERMISSIONS.FACILITIES_ADD) && (
    <Button
      disabled={offline}
      onClick={() => setPending({ kind: 'create' })}
      size="office"
    >
      <Plus aria-hidden="true" className="size-5" /> Registrar elemento
    </Button>
  );

  const body = (() => {
    switch (resolution.kind) {
      case 'producer':
        return (
          <p className="text-muted-foreground">
            Elige un productor para ver los cajones y marquesinas de sus fincas.
          </p>
        );
      case 'loading':
        return <Loading />;
      case 'error':
        return isNeverLoaded(place.farmOptions) ? (
          <EmptyState title={NEEDS_CONNECTION} />
        ) : (
          <ErrorState
            message="No fue posible cargar las fincas."
            onRetry={() => void place.farmOptions.refetch()}
          />
        );
      case 'no-farms':
        return (
          <EmptyState
            description="Registra una finca para agregar sus cajones y marquesinas."
            title="Aún no tienes fincas activas."
          />
        );
      case 'farm':
        if (isNeverLoaded(read)) return <EmptyState title={NEEDS_CONNECTION} />;
        if (read.isPending) return <Loading />;
        if (!known || !farm) {
          return (
            <ErrorState
              message="No fue posible cargar la infraestructura."
              onRetry={() => void read.refetch()}
            />
          );
        }
        return (
          <FacilityList
            actionsOf={actionsOf}
            facilities={known}
            farm={farm}
            lotHref={visibleLotHref}
            offline={offline}
            onAction={onAction}
            register={register}
          />
        );
    }
  })();

  return (
    <div className={pageContainerClass('wide', 'space-y-5')}>
      <PageHeader
        actions={farm && known ? register : undefined}
        description="Los cajones de fermentación y las marquesinas de secado de la finca, y qué lote ocupa cada uno."
        eyebrow="Poscosecha"
        title={
          farm ? `Infraestructura · ${farmLabel(farm)}` : 'Infraestructura'
        }
      />
      {superuser && (
        <ProducerFilter
          className="max-w-md"
          onClear={() => state.setProducer(null)}
          onSelect={state.setProducer}
          producer={producer ?? undefined}
          selected={selectedProducer}
        />
      )}
      {farm && place.canSwitchFarm && (
        <FacilityFarmSelect
          facilities={known}
          farm={farm}
          farms={place.farms}
          onChange={place.select}
        />
      )}
      {read.isSuccess && offline && <FacilityOfflineNotice savedAt={savedAt} />}
      {body}
      {farm && known && (
        <FacilityDialogs
          farmId={farm.id}
          farms={place.farms}
          known={known}
          lotHref={visibleLotHref}
          onClose={() => setPending(undefined)}
          onShowElement={state.showElement}
          pending={pending}
        />
      )}
    </div>
  );
}
