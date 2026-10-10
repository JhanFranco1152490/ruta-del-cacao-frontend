'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { QueueItemExistsError } from '@/lib/offline/sync-queue';

import type { ActivityOfDay } from '../activity-days';
import { ACTIVITIES_PATH } from '../activity-paths';
import type { QueuedCompletion } from '../completion-queue';
import {
  completionSummary,
  type CompletionFormValues,
  toCompletionRequest,
} from '../completion-rules';
import {
  type CatalogInput,
  completionLabel,
  emptyCompletionForm,
  queuedToFormInput,
} from '../completion-values';
import { useSaveCompletion } from '../use-completion-queue';
import { CompletionActivityCard } from './completion-activity-card';
import { CompletionConfirmDialog } from './completion-confirm-dialog';
import { CompletionForm } from './completion-form';

const SAVE_FAILED =
  'No fue posible guardar la realización en el dispositivo. Inténtalo nuevamente.';
const ALREADY_WAITING =
  'Esta actividad ya tiene una realización guardada en este dispositivo.';

const BACK_LINK = (
  <Link
    className={buttonVariants({
      size: 'office',
      variant: 'outline',
      className: CAPTURE_BUTTON_CLASS,
    })}
    href={ACTIVITIES_PATH}
  >
    Cancelar
  </Link>
);

// La captura de una realización: la actividad arriba, el formulario y, antes de guardar, el
// resumen que la persona confirma. `rejected` es lo que el servidor no aceptó: con él se corrige
// en vez de registrar de nuevo.
export function CompletionCapture({
  item,
  today,
  rejected,
  catalog,
  stocks,
  onSaved,
}: {
  item: ActivityOfDay;
  today: string;
  rejected: QueuedCompletion | undefined;
  catalog: readonly CatalogInput[] | undefined;
  stocks: ReadonlyMap<string, string> | undefined;
  onSaved: () => void;
}) {
  const { activity } = item;
  const save = useSaveCompletion();
  const sync = useCaptureSyncStatus('realizaciones');
  const [confirming, setConfirming] = useState<CompletionFormValues>();
  // Se fija al abrir: el formulario parte de lo que había en ese momento.
  const [{ values: defaultValues, unavailableRows }] = useState(() =>
    rejected
      ? queuedToFormInput(rejected, new Set(catalog?.map(({ id }) => id)))
      : { values: emptyCompletionForm(today), unavailableRows: [] },
  );
  // El botón dice qué va a pasar: sin conexión, el registro se queda en el teléfono.
  const submitLabel = sync.status.isOnline
    ? 'Guardar'
    : 'Guardar en el teléfono';

  const confirm = (values: CompletionFormValues) =>
    save.mutate(
      {
        activityId: activity.id,
        payload: {
          request: toCompletionRequest(values, new Date().toISOString()),
          label: completionLabel(activity),
        },
        correcting: !!rejected,
      },
      { onSuccess: onSaved },
    );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Actividades', href: ACTIVITIES_PATH },
          { label: 'Registrar realización' },
        ]}
      />
      <PageHeader
        description="Se guarda en este dispositivo y se envía cuando haya conexión. Después no se podrá modificar."
        eyebrow="Manejo agrícola"
        title={rejected ? 'Corregir realización' : 'Registrar realización'}
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
        <CompletionActivityCard item={item} />
        <CompletionForm
          activity={activity}
          blockedMessage={sync.blockedMessage}
          catalog={catalog}
          defaultValues={defaultValues}
          isSaving={save.isPending}
          onSubmit={setConfirming}
          secondaryAction={BACK_LINK}
          stocks={stocks}
          submitLabel={submitLabel}
          today={today}
          unavailableRows={unavailableRows}
        />
      </div>
      {confirming && (
        <CompletionConfirmDialog
          confirmLabel={submitLabel}
          error={
            !save.isError
              ? null
              : save.error instanceof QueueItemExistsError
                ? ALREADY_WAITING
                : SAVE_FAILED
          }
          isSaving={save.isPending}
          onBack={() => {
            save.reset();
            setConfirming(undefined);
          }}
          onConfirm={() => confirm(confirming)}
          summary={completionSummary(
            activity,
            confirming.done_date,
            confirming.inputs.flatMap(({ input_id, quantity }) => {
              const input = catalog?.find(({ id }) => id === input_id);
              return input ? [{ input, quantity }] : [];
            }),
          )}
        />
      )}
    </div>
  );
}
