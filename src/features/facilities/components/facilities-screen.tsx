'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { BackLink } from '@/components/back-link';
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
import { facilityActions } from '../facility-actions';
import { chooseFarmHref } from '../facility-paths';
import { useFacilityFarm } from '../use-facility-farm';
import { useFacilityFilters } from '../use-facility-filters';
import {
  FacilityDialogs,
  type PendingFacilityAction,
} from './facility-dialogs';
import { FacilityFarmChooser } from './facility-farm-chooser';
import { FacilityList } from './facility-list';
import { FacilityOfflineNotice } from './facility-offline-notice';

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

// Infraestructura: primero la finca (o el productor, para la cuenta técnica) y después sus cajones
// y marquesinas. Sin conexión muestra la última copia guardada en el dispositivo.
export function FacilitiesScreen() {
  const { data: user } = useSession();
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
  const permissions = {
    canChange: hasPermission(user, PERMISSIONS.FACILITIES_CHANGE),
    canDelete: hasPermission(user, PERMISSIONS.FACILITIES_DELETE),
    canViewLots: hasPermission(user, PERMISSIONS.LOTS_VIEW),
  };
  // Ver el lote llega con su enlace a la ficha del lote.
  const actionsOf = (facility: PostharvestFacility) =>
    facilityActions(facility, permissions).filter(
      ({ kind }) => kind !== 'view-lot',
    );
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
      case 'choose':
        return (
          <FacilityFarmChooser
            facilities={known}
            farms={place.farms}
            onChoose={place.choose}
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
            offline={offline}
            onAction={(kind, facility) => setPending({ kind, facility })}
            register={register}
          />
        );
    }
  })();

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 px-4 py-6 sm:px-8">
      {farm && place.canSwitchFarm && (
        <BackLink href={chooseFarmHref(state.filters, producer)}>
          Fincas
        </BackLink>
      )}
      <PageHeader
        actions={farm && known ? register : undefined}
        compact
        description="Los cajones de fermentación y las marquesinas de secado de tus fincas, y qué lote ocupa cada uno."
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
      {read.isSuccess && offline && <FacilityOfflineNotice savedAt={savedAt} />}
      {body}
      {farm && known && (
        <FacilityDialogs
          farmId={farm.id}
          farms={place.farms}
          known={known}
          onClose={() => setPending(undefined)}
          onShowElement={state.showElement}
          pending={pending}
        />
      )}
    </div>
  );
}
