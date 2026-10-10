'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { PageNotice } from '@/components/page-notice';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import { useSession } from '@/hooks/use-session';
import { isApiError } from '@/lib/api/errors';
import { useAgriculturalInputs, useInputStocks } from '@/lib/api/input-catalog';
import { queryKeys } from '@/lib/api/query-keys';
import { todayInBogota } from '@/lib/format/dates';
import { isPausedWithoutData } from '@/lib/offline/paused-read';
import { QueueItemExistsError } from '@/lib/offline/sync-queue';

import { ACTIVITIES_PATH } from '../activity-paths';
import { activityState, canComplete } from '../activity-state';
import { useActivity } from '../api';
import {
  completionSummary,
  type CompletionFormValues,
  toCompletionRequest,
} from '../completion-rules';
import {
  completionLabel,
  emptyCompletionForm,
  queuedToFormInput,
} from '../completion-values';
import { isCorrectableCompletionError } from '../sync-adapter';
import {
  useQueuedCompletion,
  useSaveCompletion,
} from '../use-completion-queue';
import { CompletionActivityCard } from './completion-activity-card';
import { CompletionConfirmDialog } from './completion-confirm-dialog';
import { CompletionForm } from './completion-form';
import { CompletionSavedPanel } from './completion-saved-panel';

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

// La pantalla de campo donde se registra una labor como realizada. Todo se guarda primero en el
// dispositivo: con conexión se envía de inmediato y, sin ella, cuando vuelva.
export function CompletionScreen({ activityId }: { activityId: string }) {
  const queryClient = useQueryClient();
  const { data: user } = useSession();
  const today = todayInBogota();
  const activity = useActivity(user?.id, activityId);
  const queued = useQueuedCompletion(activityId);
  const found = activity.data?.data;
  const superuser = user?.is_superuser === true;
  // La cuenta técnica lee el catálogo del productor de la actividad; las demás, el suyo.
  const catalog = useAgriculturalInputs(
    user?.id,
    superuser ? (found?.producer_id ?? null) : null,
    { enabled: !!found },
  );
  const stocks = useInputStocks(user?.id, found?.plot.farm.id ?? null);
  const save = useSaveCompletion();
  const sync = useCaptureSyncStatus('realizaciones');
  const [confirming, setConfirming] = useState<CompletionFormValues>();
  const [saved, setSaved] = useState(false);
  // Al corregir después de guardar se monta un formulario nuevo con lo que quedó en la cola.
  const [round, setRound] = useState(0);

  const catalogInputs = catalog.data?.data;
  const stockByInput = useMemo(
    () =>
      stocks.data &&
      new Map(
        stocks.data.data.map((stock) => [stock.input_id, stock.quantity]),
      ),
    [stocks.data],
  );

  if (isPausedWithoutData(activity) || activity.isError) {
    return isApiError(activity.error) && activity.error.status === 404 ? (
      <PageNotice title="Esta actividad ya no existe." />
    ) : (
      <PageNotice
        description="Ábrela una vez con conexión desde Actividades y quedará guardada para registrarla sin conexión."
        title="Necesitas conexión para abrir esta actividad."
      />
    );
  }
  const waiting =
    activity.isPending ||
    queued.isPending ||
    (catalog.isPending && !isPausedWithoutData(catalog));
  if (waiting || !found) {
    return (
      <div
        aria-label="Cargando actividad"
        className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8"
        role="status"
      >
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const label = completionLabel(found);
  const pending = queued.data ?? undefined;
  // Ya quedó guardada en el dispositivo (ahora, o en otra visita) y no hay nada que corregir.
  if (saved || (pending && pending.status !== 'error')) {
    return (
      <CompletionSavedPanel
        activityId={activityId}
        backPath={ACTIVITIES_PATH}
        canCorrect={isCorrectableCompletionError}
        label={label}
        onCorrect={() => {
          void queryClient
            .invalidateQueries({
              queryKey: queryKeys.agriculturalActivities.queued(
                user?.id ?? '',
                activityId,
              ),
            })
            .then(() => {
              setRound((value) => value + 1);
              setSaved(false);
            });
        }}
      />
    );
  }

  const item = { activity: found, ...activityState(found, today) };
  if (!canComplete(item.state, found.activity_type)) {
    return (
      <PageNotice
        description={
          item.state === 'done'
            ? 'Una actividad realizada no se modifica.'
            : 'El registro del monitoreo se habilita con el módulo de sanidad.'
        }
        title={
          item.state === 'done'
            ? 'Esta actividad ya fue registrada como realizada.'
            : 'Esta actividad no se registra aquí.'
        }
      />
    );
  }

  const active = catalogInputs?.filter((input) => input.is_active);
  const { values: defaultValues, unavailableRows } = pending
    ? queuedToFormInput(pending, new Set(active?.map((input) => input.id)))
    : { values: emptyCompletionForm(today), unavailableRows: [] };
  const submitLabel = sync.status.isOnline
    ? 'Guardar'
    : 'Guardar en el teléfono';

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
        title={pending ? 'Corregir realización' : 'Registrar realización'}
      />
      {sync.showBanner && (
        <div className="mt-6">
          <OfflineBanner status={sync.status} />
        </div>
      )}
      {pending && (
        <p
          className="mt-6 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
          role="alert"
        >
          No se pudo sincronizar
          {pending.errorMessage ? `: ${pending.errorMessage}` : '.'}
        </p>
      )}
      <div className="mt-6 space-y-6">
        <CompletionActivityCard item={item} />
        <CompletionForm
          activity={found}
          blockedMessage={sync.blockedMessage}
          catalog={active}
          defaultValues={defaultValues}
          isSaving={save.isPending}
          key={round}
          onSubmit={setConfirming}
          secondaryAction={BACK_LINK}
          stocks={stockByInput}
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
          onConfirm={() =>
            save.mutate(
              {
                activityId,
                payload: {
                  request: toCompletionRequest(
                    confirming,
                    new Date().toISOString(),
                  ),
                  label,
                },
                correcting: !!pending,
              },
              {
                onSuccess: () => {
                  setConfirming(undefined);
                  setSaved(true);
                },
              },
            )
          }
          summary={completionSummary(
            found,
            confirming.done_date,
            confirming.inputs.flatMap(({ input_id, quantity }) => {
              const input = active?.find(({ id }) => id === input_id);
              return input ? [{ input, quantity }] : [];
            }),
          )}
        />
      )}
    </div>
  );
}
