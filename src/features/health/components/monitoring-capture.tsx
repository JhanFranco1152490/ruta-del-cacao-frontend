'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useSession } from '@/hooks/use-session';
import type { components } from '@/lib/api/schema';
import { notify } from '@/lib/notify';
import { QueueItemExistsError } from '@/lib/offline/sync-queue';
import { ACTIVITIES_PATH } from '@/lib/paths/activities';

import {
  monitoringLabel,
  queuedToMonitoringForm,
} from '../monitoring-correction';
import { emptyMonitoringForm } from '../monitoring-form';
import type { QueuedMonitoring } from '../monitoring-queue';
import { toMonitoringRequest } from '../monitoring-request';
import type { MonitoringFormValues } from '../monitoring-schema';
import { monitoringSummary } from '../monitoring-summary';
import type { PestDisease } from '../pest-api';
import { awaitingSend, type SelectedPhoto } from '../photo-selection';
import { useQueuedEvidence, useSaveEvidence } from '../use-evidence-queue';
import { useSaveMonitoring } from '../use-monitoring-queue';
import type { ControlChoices } from './control-choices';
import { MonitoringActivityCard } from './monitoring-activity-card';
import { MonitoringConfirmDialog } from './monitoring-confirm-dialog';
import { MonitoringPhotosField } from './monitoring-photos-field';
import { MonitoringSheet } from './monitoring-sheet';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const SAVE_FAILED =
  'No fue posible guardar el monitoreo en el dispositivo. Inténtalo nuevamente.';
const ALREADY_WAITING =
  'Este monitoreo ya tiene un resultado guardado en este dispositivo.';
export const UNAVAILABLE_PEST_MESSAGE =
  'Esta plaga o enfermedad ya no está activa. Elige otra.';

const newId = () => crypto.randomUUID();

// La captura del resultado de un monitoreo: el monitoreo arriba, la planilla y, antes de guardar,
// el resumen que la persona confirma. `rejected` es lo que el servidor no aceptó: con él se corrige
// en vez de registrar de nuevo.
export function MonitoringCapture({
  activity,
  today,
  rejected,
  pests,
  cancelHref,
  choices,
  onSaved,
}: {
  activity: AgriculturalActivity;
  today: string;
  rejected: QueuedMonitoring | undefined;
  pests: readonly PestDisease[] | undefined;
  // A dónde lleva Cancelar: la pantalla desde la que se abrió la captura.
  cancelHref: string;
  choices: Omit<ControlChoices, 'today'>;
  onSaved: () => void;
}) {
  const { data: user } = useSession();
  const save = useSaveMonitoring();
  const saveEvidence = useSaveEvidence();
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  // Las fotos de este monitoreo que ya esperan en el dispositivo (de una corrección) cuentan para
  // el máximo; las que el servidor rechazó no van a llegar, así que no.
  const alreadyQueued = awaitingSend(
    useQueuedEvidence(user?.id, activity.id),
  ).length;
  const sync = useCaptureSyncStatus('monitoreos');
  const [confirming, setConfirming] = useState<MonitoringFormValues>();
  // Se fija al abrir: la planilla parte de lo que había en ese momento.
  const [{ values: defaultValues, unavailableRows }] = useState(() =>
    rejected
      ? queuedToMonitoringForm(
          rejected,
          pests && new Set(pests.map(({ id }) => id)),
          newId,
        )
      : { values: emptyMonitoringForm(today, newId), unavailableRows: [] },
  );
  // El botón dice qué va a pasar: sin conexión, el registro se queda en el teléfono.
  const submitLabel = sync.status.isOnline
    ? 'Guardar monitoreo'
    : 'Guardar en el teléfono';
  const pestName = (id: string) =>
    pests?.find((pest) => pest.id === id)?.name ?? 'Plaga o enfermedad';
  const assigneeName = (id: string) => choices.assigneeNames.get(id) ?? '';

  // El resultado va primero; las fotos quedan detrás, esperando a que llegue. Si las fotos no se
  // pudieran guardar, el monitoreo ya está guardado: se avisa y se adjuntan después desde su detalle.
  const confirm = (values: MonitoringFormValues) => {
    const label = monitoringLabel(activity.plot.code, values.done_date);
    save.mutate(
      {
        activityId: activity.id,
        payload: {
          request: toMonitoringRequest(values, new Date().toISOString()),
          label,
        },
        correcting: !!rejected,
      },
      {
        onSuccess: () => {
          if (photos.length === 0) return onSaved();
          saveEvidence.mutate(
            photos.map((photo) => ({
              ...photo,
              activityId: activity.id,
              kind: 'monitoring' as const,
              label,
            })),
            {
              onError: () =>
                notify.error(
                  'Las fotos no se guardaron. Adjúntalas desde el detalle del monitoreo.',
                ),
              onSettled: onSaved,
            },
          );
        },
      },
    );
  };
  const isSaving = save.isPending || saveEvidence.isPending;

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
          initialErrors={unavailableRows.map((index) => ({
            name: `detections.${index}.pest_disease_id` as const,
            message: UNAVAILABLE_PEST_MESSAGE,
          }))}
          isSaving={isSaving}
          onSubmit={setConfirming}
          photosField={
            <MonitoringPhotosField
              already={alreadyQueued}
              disabled={isSaving}
              onChange={setPhotos}
              photos={photos}
            />
          }
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
      {confirming && (
        <MonitoringConfirmDialog
          confirmLabel={submitLabel}
          error={
            !save.isError
              ? null
              : save.error instanceof QueueItemExistsError
                ? ALREADY_WAITING
                : SAVE_FAILED
          }
          isSaving={isSaving}
          onBack={() => {
            save.reset();
            setConfirming(undefined);
          }}
          onConfirm={() => confirm(confirming)}
          summary={monitoringSummary(confirming, {
            plotCode: activity.plot.code,
            pestName,
            assigneeName,
            photoCount: photos.length,
          })}
        />
      )}
    </div>
  );
}
