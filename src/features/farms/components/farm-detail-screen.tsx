'use client';

import { cn } from 'cn';
import { ChevronRight, CircleOff, MapPin, Pencil } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { formatDateTime } from '@/lib/format/dates';
import { formatHectares } from '@/lib/format/hectares';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Coordinates } from '@/types/geo';

import { type Farm, useFarmDetail } from '../api';
import type { QueuedFarm } from '../farm-queue';
import { farmEditPath } from '../farm-paths';
import { useQueuedFarm } from '../use-farm-queue';
import { CAPTURE_BUTTON_CLASS } from './capture-field-class';
import { FarmStatusBadge } from './farm-status-badge';

// Lo que una sección de la pantalla necesita de la finca: datos simples y no la respuesta de la
// API, para que otros dominios (las parcelas) no dependan de su forma.
export type FarmPlotsContext = {
  id: string;
  name: string;
  areaHectares: string;
  // Solo la del servidor: una finca con una edición pendiente todavía no la tiene a mano.
  allocatedAreaHectares?: string;
  location: Coordinates;
  isActive: boolean;
};

type FarmView = {
  id: string;
  name: string;
  municipality: string;
  department: string;
  details: string;
  areaHectares: string;
  altitudeMasl?: number | null;
  location: Coordinates;
};

export function FarmDetailScreen({
  id,
  renderPlots,
}: {
  id: string;
  renderPlots: (farm: FarmPlotsContext) => ReactNode;
}) {
  const queued = useQueuedFarm(id);

  if (queued.isPending) return <DetailSkeleton />;
  if (queued.isError) {
    return (
      <FarmUnavailable message="No fue posible leer la finca guardada en este dispositivo." />
    );
  }
  if (queued.data)
    return <QueuedFarmDetail farm={queued.data} renderPlots={renderPlots} />;
  return <ServerFarmDetail id={id} renderPlots={renderPlots} />;
}

function ServerFarmDetail({
  id,
  renderPlots,
}: {
  id: string;
  renderPlots: (farm: FarmPlotsContext) => ReactNode;
}) {
  const { data: user } = useSession();
  const farm = useFarmDetail(user?.id, id);

  if (farm.isPending) return <DetailSkeleton />;
  if (farm.isError) {
    return (
      <FarmUnavailable
        message={
          isApiError(farm.error) && farm.error.status === 404
            ? 'No encontramos esta finca entre las tuyas.'
            : 'No fue posible cargar la finca. Si no la has abierto antes con conexión, necesitas conexión para verla.'
        }
      />
    );
  }

  const { data: server, savedAt } = farm.data;
  return (
    <DetailLayout
      view={serverFarmView(server)}
      badge={
        <FarmStatusBadge status={server.is_active ? 'active' : 'inactive'} />
      }
      canEdit={hasPermission(user, PERMISSIONS.FARMS_CHANGE)}
      savedAt={savedAt}
    >
      {renderPlots({
        id: server.id,
        name: server.name,
        areaHectares: server.area_hectares,
        allocatedAreaHectares: server.allocated_area_hectares,
        location: server.location,
        isActive: server.is_active,
      })}
    </DetailLayout>
  );
}

function QueuedFarmDetail({
  farm,
  renderPlots,
}: {
  farm: QueuedFarm;
  renderPlots: (farm: FarmPlotsContext) => ReactNode;
}) {
  const { data: user } = useSession();
  const municipalityName = useMunicipalityName();
  const { values } = farm;
  const location = { latitude: values.latitude, longitude: values.longitude };
  const failed = farm.status === 'error';
  // Una edición pendiente es de una finca que ya existe en el servidor y tiene parcelas que ver.
  // Un alta todavía no existe allá: no tiene parcelas ni área asignada.
  const existsOnServer = farm.operation === 'update';

  return (
    <DetailLayout
      view={{
        id: farm.id,
        name: values.name,
        municipality: municipalityName(values.municipality_id),
        department: '',
        details: values.details,
        areaHectares: values.area_hectares,
        altitudeMasl: values.altitude_masl
          ? Number(values.altitude_masl)
          : null,
        location,
      }}
      badge={<FarmStatusBadge status={failed ? 'error' : 'pending'} />}
      canEdit={
        hasPermission(user, PERMISSIONS.FARMS_ADD) ||
        hasPermission(user, PERMISSIONS.FARMS_CHANGE)
      }
      notice={
        failed
          ? `No se pudo sincronizar${farm.errorMessage ? `: ${farm.errorMessage}` : '.'}`
          : existsOnServer
            ? 'Esta finca tiene cambios en este dispositivo que todavía no se envían.'
            : 'Esta finca está solo en este dispositivo y se enviará cuando haya conexión. Sus parcelas podrás registrarlas cuando se sincronice.'
      }
      noticeIsError={failed}
    >
      {existsOnServer &&
        renderPlots({
          id: farm.id,
          name: values.name,
          areaHectares: values.area_hectares,
          location,
          isActive: true,
        })}
    </DetailLayout>
  );
}

const serverFarmView = (farm: Farm): FarmView => ({
  id: farm.id,
  name: farm.name,
  municipality: farm.municipality.name,
  department: farm.department.name,
  details: farm.details,
  areaHectares: farm.area_hectares,
  altitudeMasl: farm.altitude_masl,
  location: farm.location,
});

function DetailLayout({
  view,
  badge,
  canEdit,
  savedAt,
  notice,
  noticeIsError = false,
  children,
}: {
  view: FarmView;
  badge: ReactNode;
  canEdit: boolean;
  savedAt?: number;
  notice?: string;
  noticeIsError?: boolean;
  children?: ReactNode;
}) {
  const place = [view.municipality, view.department].filter(Boolean).join(', ');
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <nav
        aria-label="Ruta de navegación"
        className="text-sm text-muted-foreground"
      >
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link className="underline underline-offset-4" href="/fincas">
              Fincas
            </Link>
          </li>
          <ChevronRight aria-hidden="true" className="size-4" />
          <li aria-current="page" className="font-bold text-foreground">
            {view.name}
          </li>
        </ol>
      </nav>
      <PageHeader
        eyebrow="Detalle de la finca"
        title={view.name}
        description={place}
        actions={
          canEdit && (
            <Link
              className={buttonVariants({ size: 'office', variant: 'outline' })}
              href={farmEditPath(view.id)}
            >
              <Pencil aria-hidden="true" className="size-4" /> Editar finca
            </Link>
          )
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {badge}
        {savedAt !== undefined && (
          <p className="text-sm font-bold text-muted-foreground" role="status">
            Datos guardados el {formatDateTime(new Date(savedAt).toISOString())}
            .
          </p>
        )}
      </div>
      {notice && (
        <p
          className={cn(
            'mt-4 rounded-(--radius) px-4 py-3 font-bold',
            noticeIsError ? 'bg-err-bg text-err' : 'bg-info-bg text-info',
          )}
          role={noticeIsError ? 'alert' : 'status'}
        >
          {notice}
        </p>
      )}
      <section
        aria-label="Datos de la finca"
        className="mt-6 rounded-[var(--radius-card)] bg-card p-5 shadow-card"
      >
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Área total" value={formatHectares(view.areaHectares)} />
          {view.altitudeMasl != null && (
            <Fact label="Altitud" value={`${view.altitudeMasl} m s. n. m.`} />
          )}
          <Fact
            label="Ubicación"
            value={
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-4 text-selva" />
                {view.location.latitude}, {view.location.longitude}
              </span>
            }
          />
          {view.details && <Fact label="Detalles" value={view.details} />}
        </dl>
      </section>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold text-foreground">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div
      aria-label="Cargando finca"
      className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-8"
      role="status"
    >
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </div>
  );
}

function FarmUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-8">
      <CircleOff aria-hidden="true" className="mx-auto size-10 text-err" />
      <h1 className="mt-4 text-3xl text-selva">
        No fue posible abrir la finca
      </h1>
      <p className="mt-3 text-muted-foreground" role="alert">
        {message}
      </p>
      <Link
        className={buttonVariants({
          size: 'office',
          className: cn(CAPTURE_BUTTON_CLASS, 'mt-6'),
        })}
        href="/fincas"
      >
        Volver a mis fincas
      </Link>
    </div>
  );
}
