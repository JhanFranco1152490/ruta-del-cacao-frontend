'use client';

import { CloudOff } from 'lucide-react';

import { BackLink } from '@/components/back-link';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import { ProducerFilter } from '@/components/producer-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { isNetworkFailure } from '@/lib/api/errors';
import { useProducerSummary } from '@/lib/api/producer-options';
import { formatTimestamp } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';
import { isPausedWithoutData } from '@/lib/offline/paused-read';

import { useFacilities } from '../api';
import { chooseFarmHref } from '../facility-paths';
import { useFacilityFarm } from '../use-facility-farm';
import { useFacilityFilters } from '../use-facility-filters';
import { FacilityFarmChooser } from './facility-farm-chooser';
import { FacilityList } from './facility-list';

const NEEDS_CONNECTION =
  'Necesitas conexión una vez para cargar la infraestructura.';

function offlineMessage(savedAt: number | undefined) {
  const copy =
    savedAt === undefined
      ? 'estás viendo la copia guardada'
      : `estás viendo la copia del ${formatTimestamp(savedAt)}`;
  return `Sin conexión: ${copy}. Registrar o cambiar un elemento necesita conexión.`;
}

// Una consulta que nunca llegó y no tiene copia en el dispositivo.
const neverLoaded = (
  query: Parameters<typeof isPausedWithoutData>[0] & {
    isError: boolean;
    error: unknown;
  },
) =>
  isPausedWithoutData(query) ||
  (query.isError && isNetworkFailure(query.error));

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
  const elementFarm =
    read.data?.data.find(({ id }) => id === state.element)?.farm.id ?? null;
  const place = useFacilityFarm(user?.id, superuser, elementFarm);
  const { resolution, farm } = place;
  const selectedProducer = useProducerSummary(producer ?? undefined);

  const savedAt = read.data?.savedAt;
  const offline = read.isSuccess && (!hasConnection || savedAt !== undefined);

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
        return neverLoaded(place.farmOptions) ? (
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
            facilities={read.data?.data}
            farms={place.farms}
            onChoose={place.choose}
          />
        );
      case 'farm':
        if (read.isPending && !neverLoaded(read)) return <Loading />;
        if (neverLoaded(read)) return <EmptyState title={NEEDS_CONNECTION} />;
        if (!read.data || !farm) {
          return (
            <ErrorState
              message="No fue posible cargar la infraestructura."
              onRetry={() => void read.refetch()}
            />
          );
        }
        return <FacilityList facilities={read.data.data} farm={farm} />;
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
      {offline && (
        <p
          className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm font-bold"
          role="status"
        >
          <CloudOff aria-hidden="true" className="size-5 shrink-0" />
          {offlineMessage(savedAt)}
        </p>
      )}
      {body}
    </div>
  );
}
