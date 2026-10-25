'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UseFormSetError } from 'react-hook-form';

import { OfflineBanner } from '@/components/offline-banner';
import { SyncRejectedNotice } from '@/components/sync-rejected-notice';
import type { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';
import {
  formatShortDayMonth,
  formatTime,
  fromBogotaLocal,
} from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';
import { isLocalDateTime } from '@/lib/validation/moment';

import { type Drying, type DryingLog, useUpdateLog } from '../api';
import { dayNumberOf } from '../drying-days';
import { duplicateLogDetail, sameDateLog } from '../duplicate-log';
import {
  correctionError,
  DUPLICATE_ERROR,
  SAVE_LOG_FAILED,
} from '../log-errors';
import {
  type LogFormInput,
  type LogFormValues,
  toLogCreateRequest,
} from '../log-form';
import { logQueueLabel, pendingLogsOf, type QueuedLog } from '../log-queue';
import { formOfLog, logChanges, startLogForm } from '../log-values';
import { useSaveLog } from '../use-log-queue';
import { LogFormFields } from './log-form-fields';
import { PreviousLog } from './previous-log';

// Registrar la bitácora de un día, corregir la que el servidor rechazó (`rejected`) o corregir una
// del servidor (`serverLog`). Las dos primeras pasan por la cola del dispositivo; la última es en
// línea.
export function LogCapture({
  drying,
  queued,
  rejected,
  serverLog,
  sync,
  returnPath,
  finish,
  logsHref,
}: {
  drying: Drying;
  // Las bitácoras que siguen en la cola del teléfono, de cualquier lote.
  queued: readonly QueuedLog[];
  rejected?: QueuedLog;
  serverLog?: DryingLog;
  sync: ReturnType<typeof useCaptureSyncStatus>;
  returnPath: string;
  finish: (title: string) => void;
  logsHref: string;
}) {
  const router = useRouter();
  const save = useSaveLog();
  const update = useUpdateLog(drying.lot.id);
  const [formError, setFormError] = useState<string>();
  const [id] = useState(
    () => rejected?.id ?? serverLog?.id ?? crypto.randomUUID(),
  );
  const { lot, farm, facility } = drying;
  const isOnline = sync.status.isOnline;

  // Las bitácoras con las que se compara la fecha: las del servidor y las que van camino a él desde
  // este teléfono, sin la que se está corrigiendo.
  const known = [
    ...drying.logs,
    ...pendingLogsOf(queued, lot.id).map(({ request }) => request),
  ].filter((log) => log.id !== id);
  const previous = known
    .toSorted((a, b) => a.measured_at.localeCompare(b.measured_at))
    .at(-1);
  const dayOf = (iso: string) => dayNumberOf(drying.started_at, iso);

  const heading = (localTime: string) => {
    const at = isLocalDateTime(localTime)
      ? fromBogotaLocal(localTime)
      : new Date().toISOString();
    const day = dayOf(at);
    return serverLog || rejected
      ? `Corregir bitácora del día ${day}`
      : `Bitácora del día ${day}`;
  };

  const defaultValues: LogFormInput = serverLog
    ? formOfLog(serverLog)
    : rejected
      ? formOfLog(rejected.request)
      : startLogForm(new Date());

  const submit = (
    values: LogFormValues,
    setError: UseFormSetError<LogFormInput>,
  ) => {
    setFormError(undefined);
    const measuredAt = fromBogotaLocal(values.measured_at);
    const duplicate = sameDateLog(known, measuredAt);
    if (duplicate) {
      setError('measured_at', {
        type: DUPLICATE_ERROR,
        message: duplicateLogDetail(duplicate.measured_at),
      });
      return;
    }
    const day = dayOf(measuredAt);

    if (serverLog) {
      const changes = logChanges(values, serverLog);
      if (Object.keys(changes).length === 0) {
        router.replace(returnPath);
        return;
      }
      update.mutate(
        {
          logId: serverLog.id,
          body: { ...changes, expected_version: serverLog.version },
        },
        {
          onSuccess: () => finish(`Bitácora del día ${day} corregida`),
          onError: (error) => setFormError(correctionError(error, setError)),
        },
      );
      return;
    }

    save.mutate(
      {
        payload: {
          lotId: lot.id,
          request: toLogCreateRequest(values, {
            id,
            capturedAt: new Date().toISOString(),
          }),
          label: logQueueLabel(lot.code, day, measuredAt),
        },
        correcting: !!rejected,
      },
      {
        onSuccess: () =>
          finish(
            rejected
              ? 'Bitácora corregida'
              : `Bitácora del día ${day} registrada`,
          ),
        onError: () => setFormError(SAVE_LOG_FAILED),
      },
    );
  };

  return (
    <LogFormFields
      cancelHref={returnPath}
      defaultValues={defaultValues}
      description={`${lot.code} · ${facility.name} · ${farmLabel(farm)} · inició el ${formatShortDayMonth(drying.started_at)}. a las ${formatTime(drying.started_at)}`}
      disabledMessage={
        serverLog && !isOnline
          ? 'Corregir una bitácora necesita conexión.'
          : sync.blockedMessage
      }
      formError={formError}
      heading={heading}
      isSaving={save.isPending || update.isPending}
      logsHref={logsHref}
      notices={
        <>
          {!serverLog && sync.showBanner && (
            <OfflineBanner status={sync.status} />
          )}
          {rejected && (
            <SyncRejectedNotice errorMessage={rejected.errorMessage} />
          )}
          {previous && (
            <PreviousLog day={dayOf(previous.measured_at)} log={previous} />
          )}
        </>
      }
      onSubmit={submit}
      startedAt={drying.started_at}
      submitLabel={serverLog || isOnline ? 'Guardar' : 'Guardar en el teléfono'}
    />
  );
}
