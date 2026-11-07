'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { TextField } from '@/components/text-field';

import { type LotQuality, useClassifyLot } from '../api';
import {
  classificationBalance,
  type ClassificationFormInput,
  classificationFormSchema,
  emptyClassificationForm,
  hasDiscard,
  toClassificationRequest,
} from '../classification-form';
import { evaluationFacts, lotBrief } from '../quality-card-facts';
import { qualityFailureOf } from '../quality-errors';
import { DiscardReasonFields } from './discard-reason-fields';
import { QualityFacts } from './quality-facts';

export const LOT_CLASSIFIED = 'Lote clasificado.';

const KILO_FIELDS = [
  ['g1_kg', 'G1 (kg)'],
  ['g2_kg', 'G2 (kg)'],
  ['discard_kg', 'Descarte (kg)'],
] as const;

// Repartir el peso seco de un lote Evaluado entre G1, G2 y descarte. Lo repartido y lo que falta o
// sobra se leen mientras se escribe, y no se guarda hasta que la diferencia sea cero. Con kilos de
// descarte se pide el motivo.
export function ClassificationDialog({
  lot,
  onClose,
  onSaved,
  onStatusChanged,
}: {
  lot: LotQuality;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
}) {
  const [current, setCurrent] = useState(lot);
  const form = useForm<ClassificationFormInput>({
    resolver: zodResolver(classificationFormSchema),
    defaultValues: emptyClassificationForm(),
  });
  const { errors } = form.formState;
  const [g1, g2, discard, reason] = useWatch({
    control: form.control,
    name: ['g1_kg', 'g2_kg', 'discard_kg', 'discard_reason'],
  });
  const balance = classificationBalance(
    { g1_kg: g1, g2_kg: g2, discard_kg: discard },
    current.dry_weight_kg,
  );
  const classify = useClassifyLot(lot.lot.id);
  const [summary, setSummary] = useState<string>();

  const submit = (values: ClassificationFormInput) => {
    setSummary(undefined);
    classify.mutate(toClassificationRequest(values, current.lot.version), {
      onSuccess: () => onSaved(LOT_CLASSIFIED),
      onError: (error) => {
        const failure = qualityFailureOf(error, 'clasificar');
        if (failure.kind === 'status') return onStatusChanged(failure.message);
        if (failure.kind === 'field') {
          form.setError(failure.field as keyof ClassificationFormInput, {
            type: 'server',
            message: failure.message,
          });
          return;
        }
        if (failure.kind === 'stale' && failure.current) {
          setCurrent(failure.current);
        }
        setSummary(failure.message);
      },
    });
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={lotBrief(current)}
      error={summary}
      isSaving={classify.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      submitDisabled={!balance.balanced}
      submitLabel="Guardar clasificación"
      title={`Clasificar · ${lot.lot.code}`}
    >
      <div className="rounded-(--radius) bg-surface-alt px-4 py-3">
        <QualityFacts facts={evaluationFacts(current)} label="Evaluación" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {KILO_FIELDS.map(([name, label]) => (
          <TextField
            disabled={classify.isPending}
            error={errors[name]?.message}
            inputMode="decimal"
            key={name}
            label={label}
            {...form.register(name)}
          />
        ))}
      </div>
      <p
        aria-live="polite"
        className="rounded-(--radius) border border-border px-4 py-3 text-sm"
      >
        <span className="block font-bold tabular-nums">
          {balance.distributedLine}
        </span>
        {balance.differenceLine && (
          <span className="block font-bold text-warn tabular-nums">
            {balance.differenceLine}
          </span>
        )}
      </p>
      {hasDiscard(discard) && (
        <DiscardReasonFields
          detailProps={{
            disabled: classify.isPending,
            error: errors.discard_detail?.message,
            ...form.register('discard_detail'),
          }}
          reason={reason}
          reasonProps={{
            disabled: classify.isPending,
            error: errors.discard_reason?.message,
            ...form.register('discard_reason'),
          }}
        />
      )}
    </FormDialog>
  );
}
