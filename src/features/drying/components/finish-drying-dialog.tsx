'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { TextField } from '@/components/text-field';
import { toBogotaLocal } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { durationLine } from '@/lib/format/hours';
import { decimalText } from '@/lib/validation/decimal';

import { type Drying, useFinishDrying } from '../api';
import { finishFailureOf } from '../finish-errors';
import {
  createFinishFormSchema,
  type FinishFormInput,
  finishFormOf,
  finishedMessage,
  toFinishRequest,
  yieldLine,
} from '../finish-form';
import { isOutsideRange, outOfTargetLine, rangeText } from '../moisture';

// «Meta: 6,5–7,5 %», y si la humedad escrita queda fuera, que está fuera de la meta: no impide
// finalizar, solo se dice.
function moistureHint(typed: string, target: Drying['target_moisture']) {
  const meta = `Meta: ${rangeText(target)}.`;
  const text = decimalText().parse(typed);
  return text !== '' &&
    !Number.isNaN(Number(text)) &&
    isOutsideRange(text, target)
    ? `${meta} ${outOfTargetLine(target)}`
    : meta;
}

// Finalizar el secado de un lote: guarda la humedad final y el peso seco, calcula el rendimiento,
// deja el lote Seco y libera la marquesina. Solo se abre con al menos una bitácora, sin bitácoras
// en la cola y con conexión; quien lo abre lo decide con `finishBlockedReason`. `onSaved` recibe el
// aviso con el rendimiento.
export function FinishDryingDialog({
  drying,
  onClose,
  onSaved,
}: {
  drying: Drying;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [now] = useState(() => new Date());
  const { lot, facility, started_at: startedAt, logs } = drying;
  const lastMeasuredAt =
    logs
      .map(({ measured_at }) => measured_at)
      .toSorted()
      .at(-1) ?? null;
  const resolver = useMemo(
    () =>
      zodResolver(
        createFinishFormSchema({
          lastMeasuredAt,
          greenWeightKg: lot.green_weight_kg,
        }),
      ),
    [lastMeasuredAt, lot.green_weight_kg],
  );
  const form = useForm<FinishFormInput>({
    resolver,
    defaultValues: finishFormOf(now),
  });
  const { errors } = form.formState;
  const [localEnd, moisture, dryWeight] = useWatch({
    control: form.control,
    name: ['ended_at', 'final_moisture_pct', 'dry_weight_kg'],
  });
  const finish = useFinishDrying(lot.id);
  const [summary, setSummary] = useState<string>();

  const submit = (values: FinishFormInput) => {
    setSummary(undefined);
    finish.mutate(toFinishRequest(values, drying.version), {
      onSuccess: (finished) =>
        onSaved(finishedMessage(finished.result?.yield_pct ?? '0')),
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
      description={`${facility.name} · día ${drying.current_day} · ${formatDecimal(lot.green_weight_kg, 1)} kg en verde`}
      error={summary}
      isSaving={finish.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      pendingLabel="Finalizando…"
      submitLabel="Finalizar"
      title={`Finalizar secado · ${lot.code}`}
    >
      <TextField
        disabled={finish.isPending}
        error={errors.ended_at?.message}
        hint={durationLine(startedAt, localEnd) ?? undefined}
        label="Fecha y hora de finalización"
        max={toBogotaLocal(now.toISOString())}
        min={toBogotaLocal(lastMeasuredAt ?? startedAt)}
        type="datetime-local"
        {...form.register('ended_at')}
      />
      <TextField
        disabled={finish.isPending}
        error={errors.final_moisture_pct?.message}
        hint={moistureHint(moisture, drying.target_moisture)}
        inputMode="decimal"
        label="Humedad final (%)"
        {...form.register('final_moisture_pct')}
      />
      <TextField
        disabled={finish.isPending}
        error={errors.dry_weight_kg?.message}
        hint={yieldLine(dryWeight, lot.green_weight_kg) ?? undefined}
        inputMode="decimal"
        label="Peso seco (kg)"
        {...form.register('dry_weight_kg')}
      />
      <p className="rounded-(--radius) bg-surface-alt px-4 py-3 text-sm">
        El lote quedará Seco y la marquesina {facility.name} quedará Disponible.
      </p>
    </FormDialog>
  );
}
