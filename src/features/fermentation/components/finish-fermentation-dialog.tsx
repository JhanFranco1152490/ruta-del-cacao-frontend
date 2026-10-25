'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
import { toBogotaLocal } from '@/lib/format/dates';

import { type Fermentation, useFinishFermentation } from '../api';
import { finishFailureOf } from '../finish-errors';
import {
  createFinishFormSchema,
  type FinishFormInput,
  finishFormOf,
  finishedMessage,
  toFinishRequest,
} from '../finish-form';
import { turnsText } from '../fermentation-time';
import { durationLine, hoursBetween } from '@/lib/format/hours';
import { NOTES_MAX_LENGTH } from '@/lib/validation/moment';
import { lastTurnedAt } from '../turn-rules';

// Finalizar la fermentación de un lote: libera el cajón y deja el lote listo para el secado. Solo
// se abre con al menos un volteo, sin volteos en la cola y con conexión; quien lo abre lo decide
// con `finishBlockedReason`. `onSaved` recibe el aviso con la duración.
export function FinishFermentationDialog({
  fermentation,
  onClose,
  onSaved,
}: {
  fermentation: Fermentation;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [now] = useState(() => new Date());
  const { lot, facility, started_at: startedAt, turns } = fermentation;
  const lastTurn = lastTurnedAt(turns);
  const resolver = useMemo(
    () =>
      zodResolver(
        createFinishFormSchema({ startedAt, lastTurnedAt: lastTurn }),
      ),
    [startedAt, lastTurn],
  );
  const form = useForm<FinishFormInput>({
    resolver,
    defaultValues: finishFormOf(now),
  });
  const { errors } = form.formState;
  const localEnd = useWatch({ control: form.control, name: 'ended_at' });
  const finish = useFinishFermentation(lot.id);
  const [summary, setSummary] = useState<string>();
  const hours = Math.round(hoursBetween(startedAt, now.toISOString()));

  const submit = (values: FinishFormInput) => {
    setSummary(undefined);
    finish.mutate(toFinishRequest(values, fermentation.version), {
      onSuccess: (finished) =>
        onSaved(finishedMessage(finished.result?.duration_hours ?? '0')),
      onError: (error) => {
        const failure = finishFailureOf(error);
        if (failure.kind === 'field') {
          form.setError(failure.field, {
            type: 'server',
            message: failure.message,
          });
        } else {
          setSummary(failure.message);
        }
      },
    });
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={`${facility.name} · ${turnsText(turns.length)} · ${hours} h`}
      error={summary}
      isSaving={finish.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      pendingLabel="Finalizando…"
      submitLabel="Finalizar"
      title={`Finalizar fermentación · ${lot.code}`}
    >
      <TextField
        disabled={finish.isPending}
        error={errors.ended_at?.message}
        hint={durationLine(startedAt, localEnd) ?? undefined}
        label="Fecha y hora de finalización"
        max={toBogotaLocal(now.toISOString())}
        min={toBogotaLocal(lastTurn ?? startedAt)}
        type="datetime-local"
        {...form.register('ended_at')}
      />
      <TextAreaField
        disabled={finish.isPending}
        error={errors.notes?.message}
        hint={`Opcional, hasta ${NOTES_MAX_LENGTH} caracteres.`}
        label="Observaciones"
        placeholder="Color al corte, olor, lo que se observó."
        {...form.register('notes')}
      />
      <p className="rounded-(--radius) bg-surface-alt px-4 py-3 text-sm">
        El lote quedará Fermentado, listo para el secado, y el cajón{' '}
        {facility.name} quedará Disponible.
      </p>
    </FormDialog>
  );
}
