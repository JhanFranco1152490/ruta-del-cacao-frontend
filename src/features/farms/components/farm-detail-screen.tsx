'use client';

import { cn } from 'cn';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { useSession } from '@/hooks/use-session';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { readOrigin } from '@/lib/navigation/origin';
import { producerLabelOf } from '@/lib/format/producer';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Coordinates } from '@/types/geo';

import type { Farm } from '../api';
import type { QueuedFarm } from '../farm-queue';
import { useFarmSource } from '../use-farm-source';
import { FarmDetailHeader } from './farm-detail-header';
import { FarmStatusBadge } from './farm-status-badge';
import { FarmScreenSkeleton, FarmUnavailable } from './farm-screen-states';
import { farmLabel } from '@/lib/format/place-label';
import { pageContainerClass } from '@/components/page-container';

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
  // Todavía no existe en el servidor: solo tiene las parcelas que esperan en el dispositivo.
  isPendingCreate?: boolean;
  // De quién es la finca, escrito para mostrarlo. Solo la del servidor.
  producerLabel?: string;
};

type FarmView = {
  id: string;
  // Solo la del servidor: la que espera en la cola todavía no tiene código.
  code?: string;
  name: string;
  // Solo la finca del servidor: la que está en la cola todavía no trae el nombre de su productor.
  producer?: Farm['producer'];
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
  const source = useFarmSource(id);

  switch (source.status) {
    case 'loading':
      return <FarmScreenSkeleton />;
    case 'error':
      return <FarmUnavailable message={source.message} />;
    case 'queued':
      return (
        <QueuedFarmDetail farm={source.queued} renderPlots={renderPlots} />
      );
    case 'server':
      return (
        <ServerFarmDetail
          farm={source.farm}
          renderPlots={renderPlots}
          savedAt={source.savedAt}
        />
      );
  }
}

function ServerFarmDetail({
  farm: server,
  savedAt,
  renderPlots,
}: {
  farm: Farm;
  savedAt?: number;
  renderPlots: (farm: FarmPlotsContext) => ReactNode;
}) {
  const { data: user } = useSession();
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
        producerLabel: producerLabelOf(server.producer),
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
  // Un alta todavía no existe allá: no tiene área asignada ni parcelas del servidor, solo las que
  // esperan en el dispositivo.
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
            : 'Esta finca está solo en este dispositivo y se enviará cuando haya conexión. Puedes registrar sus parcelas ahora: se enviarán después de la finca.'
      }
      noticeIsError={failed}
    >
      {renderPlots({
        id: farm.id,
        name: values.name,
        areaHectares: values.area_hectares,
        location,
        isActive: true,
        isPendingCreate: !existsOnServer,
      })}
    </DetailLayout>
  );
}

const serverFarmView = (farm: Farm): FarmView => ({
  id: farm.id,
  code: farm.code,
  name: farm.name,
  producer: farm.producer,
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
  const { data: user } = useSession();
  const origin = readOrigin(useSearchParams());
  // De quién es la finca, para quien no tiene un productor propio (solo lectura: no cambia de dueño).
  const showProducer = !!view.producer && !user?.producer_id;
  // Las existencias de insumos de esta finca. Solo la finca que ya está en el servidor las tiene.
  const showInputs =
    !!view.producer && hasPermission(user, PERMISSIONS.INPUTS_VIEW);
  const noticeBox = notice && (
    <p
      className={cn(
        'mt-3 rounded-(--radius) px-4 py-3 font-bold',
        noticeIsError ? 'bg-err-bg text-err' : 'bg-info-bg text-info',
      )}
      role={noticeIsError ? 'alert' : 'status'}
    >
      {notice}
    </p>
  );
  return (
    <div className={pageContainerClass('wide')}>
      <Breadcrumb
        items={[
          { label: 'Fincas', href: '/fincas' },
          { label: farmLabel(view) },
        ]}
      />
      <FarmDetailHeader
        badge={badge}
        canEdit={canEdit}
        canOpenProducer={hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)}
        place={place}
        savedAt={savedAt}
        showInputs={showInputs}
        showProducer={showProducer}
        view={view}
      />
      {noticeBox}
      {children}
      <div className="mt-6">
        <DetailFooter backHref={origin ?? '/fincas'} />
      </div>
    </div>
  );
}
