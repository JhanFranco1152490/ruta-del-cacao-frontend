'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import type { components } from '@/lib/api/schema';
import { ACTIVITIES_PATH } from '@/lib/paths/activities';

import { emptyMonitoringForm } from '../monitoring-form';
import type { QueuedMonitoring } from '../monitoring-queue';
import type { MonitoringFormValues } from '../monitoring-schema';
import type { PestDisease } from '../pest-api';
import type { ControlChoices } from './control-choices';
import { MonitoringActivityCard } from './monitoring-activity-card';
import { MonitoringSheet } from './monitoring-sheet';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// La captura del resultado de un monitoreo: el monitoreo arriba y la planilla. `rejected` es lo que
// el servidor no aceptó: con él se corrige en vez de registrar de nuevo.
export function MonitoringCapture({
  activity,
  today,
  rejected,
  pests,
  cancelHref,
  choices,
  onSubmit = () => undefined,
}: {
  activity: AgriculturalActivity;
  today: string;
  rejected: QueuedMonitoring | undefined;
  pests: readonly PestDisease[] | undefined;
  // A dónde lleva Cancelar: la pantalla desde la que se abrió la captura.
  cancelHref: string;
  choices: Omit<ControlChoices, 'today'>;
  onSubmit?: (values: MonitoringFormValues) => void;
}) {
  const sync = useCaptureSyncStatus('monitoreos');
  // Se fija al abrir: la planilla parte de lo que había en ese momento.
  const [defaultValues] = useState(() =>
    emptyMonitoringForm(today, () => crypto.randomUUID()),
  );
  // El botón dice qué va a pasar: sin conexión, el registro se queda en el teléfono.
  const submitLabel = sync.status.isOnline
    ? 'Guardar monitoreo'
    : 'Guardar en el teléfono';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Actividades', href: ACTIVITIES_PATH },
          { label: 'Registrar monitoreo' },
        ]}
      />
      <PageHeader
        description="Se guarda en este dispositivo y se envía cuando haya conexión. Después no se podrá modificar."
        eyebrow="Sanidad de la parcela"
        title={
          rejected ? 'Corregir monitoreo' : 'Registrar monitoreo fitosanitario'
        }
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
      <div className="mt-6 space-y-6">
        <MonitoringActivityCard activity={activity} />
        <MonitoringSheet
          blockedMessage={sync.blockedMessage}
          choices={choices}
          defaultValues={defaultValues}
          isSaving={false}
          onSubmit={onSubmit}
          pests={pests}
          scheduledAt={activity.created_at}
          secondaryAction={
            <Link
              className={buttonVariants({
                size: 'office',
                variant: 'outline',
                className: CAPTURE_BUTTON_CLASS,
              })}
              href={cancelHref}
            >
              Cancelar
            </Link>
          }
          submitLabel={submitLabel}
          today={today}
        />
      </div>
    </div>
  );
}
