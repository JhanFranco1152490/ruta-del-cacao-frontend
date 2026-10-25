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

import {
  type Fermentation,
  type FermentationTurn,
  useUpdateTurn,
} from '../api';
import { duplicateTurnMessage, sameMinuteTurn } from '../duplicate-turn';
import {
  type TurnFormInput,
  type TurnFormValues,
  toTurnCreateRequest,
} from '../turn-form';
import { isLocalDateTime } from '@/lib/validation/moment';
import { pendingTurnsOf, type QueuedTurn, turnQueueLabel } from '../turn-queue';
import {
  correctionError,
  DUPLICATE_ERROR,
  SAVE_TURN_FAILED,
} from '../turn-errors';
import { numberTurns, turnNumberAt } from '../turn-rules';
import { formOfTurn, startTurnForm, turnChanges } from '../turn-values';
import { useSaveTurn } from '../use-turn-queue';
import { PreviousTurn } from './previous-turn';
import { TurnFormFields } from './turn-form-fields';

// Registrar un volteo, corregir el que el servidor rechazó (`rejected`) o corregir uno del servidor
// (`serverTurn`). Los dos primeros pasan por la cola del dispositivo; el último es en línea.
export function TurnCapture({
  fermentation,
  queued,
  rejected,
  serverTurn,
  sync,
  returnPath,
  finish,
  turnsHref,
}: {
  fermentation: Fermentation;
  // Los volteos que siguen en la cola del teléfono, de cualquier lote.
  queued: readonly QueuedTurn[];
  rejected?: QueuedTurn;
  serverTurn?: FermentationTurn;
  sync: ReturnType<typeof useCaptureSyncStatus>;
  returnPath: string;
  finish: (title: string) => void;
  turnsHref: string;
}) {
  const router = useRouter();
  const save = useSaveTurn();
  const update = useUpdateTurn(fermentation.lot.id);
  const [formError, setFormError] = useState<string>();
  const [id] = useState(
    () => rejected?.id ?? serverTurn?.id ?? crypto.randomUUID(),
  );
  const { lot, farm, facility } = fermentation;
  const isOnline = sync.status.isOnline;

  // Los volteos con los que se numera y se compara la hora: los del servidor y los que van camino
  // a él desde este teléfono, sin el que se está corrigiendo.
  const known = [
    ...fermentation.turns,
    ...pendingTurnsOf(queued, lot.id).map(({ request }) => request),
  ].filter((turn) => turn.id !== id);
  const numberAt = (iso: string) => turnNumberAt(known, iso);
  const previous = numberTurns(known).at(-1);
  const correctedNumber = serverTurn
    ? numberAt(serverTurn.turned_at)
    : rejected && numberAt(rejected.request.turned_at);

  const heading = (localTime: string) => {
    if (correctedNumber) return `Corregir volteo ${correctedNumber}`;
    const at = isLocalDateTime(localTime)
      ? fromBogotaLocal(localTime)
      : new Date().toISOString();
    return `Volteo ${numberAt(at)}`;
  };

  const defaultValues: TurnFormInput = serverTurn
    ? formOfTurn(serverTurn)
    : rejected
      ? formOfTurn(rejected.request)
      : startTurnForm(new Date());

  const submit = (
    values: TurnFormValues,
    setError: UseFormSetError<TurnFormInput>,
  ) => {
    setFormError(undefined);
    const turnedAt = fromBogotaLocal(values.turned_at);
    const duplicate = sameMinuteTurn(known, turnedAt);
    if (duplicate) {
      setError('turned_at', {
        type: DUPLICATE_ERROR,
        message: duplicateTurnMessage(duplicate.turned_at),
      });
      return;
    }
    const number = numberAt(turnedAt);

    if (serverTurn) {
      const changes = turnChanges(values, serverTurn);
      if (Object.keys(changes).length === 0) {
        router.replace(returnPath);
        return;
      }
      update.mutate(
        {
          turnId: serverTurn.id,
          body: { ...changes, expected_version: serverTurn.version },
        },
        {
          onSuccess: () => finish(`Volteo ${number} corregido`),
          onError: (error) => setFormError(correctionError(error, setError)),
        },
      );
      return;
    }

    save.mutate(
      {
        payload: {
          lotId: lot.id,
          request: toTurnCreateRequest(values, {
            id,
            capturedAt: new Date().toISOString(),
          }),
          label: turnQueueLabel(lot.code, number, turnedAt),
        },
        correcting: !!rejected,
      },
      {
        onSuccess: () =>
          finish(rejected ? 'Volteo corregido' : `Volteo ${number} registrado`),
        onError: () => setFormError(SAVE_TURN_FAILED),
      },
    );
  };

  return (
    <TurnFormFields
      cancelHref={returnPath}
      defaultValues={defaultValues}
      description={`${lot.code} · ${facility.name} · ${farmLabel(farm)} · inició el ${formatShortDayMonth(fermentation.started_at)}. a las ${formatTime(fermentation.started_at)}`}
      disabledMessage={
        serverTurn && !isOnline
          ? 'Corregir un volteo necesita conexión.'
          : sync.blockedMessage
      }
      formError={formError}
      heading={heading}
      isSaving={save.isPending || update.isPending}
      notices={
        <>
          {!serverTurn && sync.showBanner && (
            <OfflineBanner status={sync.status} />
          )}
          {rejected && (
            <SyncRejectedNotice errorMessage={rejected.errorMessage} />
          )}
          {previous && (
            <PreviousTurn number={previous.number} turn={previous.turn} />
          )}
        </>
      }
      onSubmit={submit}
      startedAt={fermentation.started_at}
      submitLabel={
        serverTurn || isOnline ? 'Guardar' : 'Guardar en el teléfono'
      }
      turnsHref={turnsHref}
    />
  );
}
