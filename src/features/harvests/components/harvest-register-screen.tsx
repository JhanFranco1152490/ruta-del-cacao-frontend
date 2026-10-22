'use client';

import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { Skeleton } from '@/components/ui/skeleton';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { HarvestLotSource } from '../harvest-lot-source';
import { HARVESTS_PATH } from '../harvest-paths';
import type { HarvestPlotChoice } from '../harvest-plots';
import { readLastPlot } from '../last-plot';
import { useHarvestSources } from '../use-harvest-sources';
import { useQueuedHarvest } from '../use-harvest-queue';
import { HarvestCapture } from './harvest-capture';
import { pageContainerClass } from '@/components/page-container';

// La pantalla de campo donde se registra una recolección. Todo se guarda primero en el
// dispositivo: con conexión se envía de inmediato y, sin ella, cuando vuelva. `plotId` llega al
// abrirla desde una parcela; `pendingId`, al corregir desde la bandeja lo que el servidor rechazó.
export function HarvestRegisterScreen({
  plotId,
  pendingId,
  renderFormLot,
  characterizationHref,
}: {
  plotId?: string;
  pendingId?: string;
  renderFormLot?: (source: HarvestLotSource) => ReactNode;
  // Dónde se completa la ficha de una parcela; lo da quien monta la pantalla (otro dominio).
  characterizationHref?: (plot: HarvestPlotChoice) => string;
}) {
  const today = todayInBogota();
  const sources = useHarvestSources();
  const queued = useQueuedHarvest(pendingId ?? '');
  const sync = useCaptureSyncStatus('cosechas');
  const { returnPath, finish } = useFinishSave(HARVESTS_PATH);
  const { data: user } = useSession();
  // Se fija al abrir: recordar otra parcela al guardar no debe mover el formulario.
  const [remembered] = useState(() => (user ? readLastPlot(user.id) : null));
  const correcting = !!pendingId;

  if (sources.status === 'unreachable') {
    return (
      <PageNotice
        description="Abre Cosechas una vez con conexión y tus parcelas quedarán guardadas para registrar sin conexión."
        illustration={OfflineCloud}
        title="Necesitas conexión una vez para cargar tus parcelas."
      />
    );
  }
  if (sources.status === 'loading' || (correcting && queued.isPending)) {
    return (
      <div
        aria-label="Cargando parcelas"
        className={pageContainerClass('narrow', 'space-y-6')}
        role="status"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  const rejected = correcting ? (queued.data ?? undefined) : undefined;
  if (correcting && !rejected) {
    return (
      <PageNotice
        description="Ya no está en los registros de este dispositivo: se envió o se descartó."
        title="Esta cosecha ya no está pendiente."
      />
    );
  }
  if (rejected && rejected.status !== 'error') {
    return (
      <PageNotice
        description="Está en los registros del dispositivo y se enviará al servidor."
        title="Esta cosecha ya está guardada."
      />
    );
  }

  const { plots } = sources;
  const usable = (id: string | null | undefined) =>
    plots.find((plot) => plot.id === id && !plot.disabled)?.id;
  const askedPlot = plotId ? plots.find(({ id }) => id === plotId) : undefined;
  const canCharacterize = hasPermission(user, PERMISSIONS.CROPS_CHARACTERIZE);

  return (
    <div className={pageContainerClass('narrow')}>
      <Breadcrumb
        items={[
          { label: 'Cosechas', href: HARVESTS_PATH },
          { label: correcting ? 'Corregir cosecha' : 'Registrar cosecha' },
        ]}
      />
      <PageHeader
        description="La recolección se guarda en este dispositivo y se envía cuando haya conexión."
        eyebrow="Producción"
        title={correcting ? 'Corregir cosecha' : 'Registrar cosecha'}
      />
      {sync.showBanner && (
        <div className="mt-6">
          <OfflineBanner status={sync.status} />
        </div>
      )}
      {rejected && (
        <p
          className="mt-6 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
          role="alert"
        >
          No se pudo sincronizar
          {rejected.errorMessage ? `: ${rejected.errorMessage}` : '.'}
        </p>
      )}
      {askedPlot?.disabled && (
        <div
          className="mt-6 space-y-2 rounded-(--radius) bg-warn-bg px-4 py-3"
          role="status"
        >
          <p className="font-bold text-warn">
            {askedPlot.label} no tiene siembras en su ficha: no se puede
            cosechar todavía.
          </p>
          {canCharacterize && characterizationHref && (
            <Link
              className="font-bold underline"
              href={characterizationHref(askedPlot)}
            >
              Completar la ficha
            </Link>
          )}
        </div>
      )}
      <div className="mt-6">
        <HarvestCapture
          blockedMessage={sync.blockedMessage}
          doneHref={returnPath}
          initialPlotId={usable(plotId) ?? usable(remembered) ?? ''}
          isOnline={sync.status.isOnline}
          onCorrected={() => finish('Cosecha corregida')}
          plots={plots}
          rejected={rejected}
          renderFormLot={renderFormLot}
          submitLabel={
            sync.status.isOnline ? 'Guardar' : 'Guardar en el teléfono'
          }
          today={today}
          truncated={sources.truncated}
        />
      </div>
    </div>
  );
}
