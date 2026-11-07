'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';

import {
  type LotQuality,
  useCorrectEvaluation,
  useRecordEvaluation,
} from '../api';
import {
  type EvaluationFormInput,
  evaluationFormOf,
  evaluationFormSchema,
  NOTES_MAX_LENGTH,
  toEvaluationCorrection,
  toEvaluationRequest,
} from '../evaluation-form';
import { evaluationSum } from '../evaluation-sum';
import { lotBrief } from '../quality-card-facts';
import { qualityFailureOf } from '../quality-errors';

export const EVALUATION_SAVED = 'Evaluación registrada.';
export const EVALUATION_UPDATED = 'Evaluación actualizada.';
export const NO_CHANGES = 'No hubo cambios que guardar.';

const PERCENT_FIELDS = [
  ['well_fermented_pct', 'Bien fermentados (%)'],
  ['moldy_pct', 'Con moho (%)'],
  ['other_defects_pct', 'Otros defectos (%)'],
] as const;

const sameValues = (a: EvaluationFormInput, b: EvaluationFormInput) =>
  PERCENT_FIELDS.every(
    ([name]) =>
      Number(a[name].replace(',', '.')) === Number(b[name].replace(',', '.')),
  ) && a.notes.trim() === b.notes.trim();

// Registrar la evaluación física de un lote Seco, o corregir la de uno Evaluado. La suma de los tres
// porcentajes se lee mientras se escribe y no deja guardar si pasa de 100. Si el lote cambió de
// estado entretanto, quien abre el diálogo recibe el aviso en `onStatusChanged`.
export function EvaluationDialog({
  lot,
  correcting,
  onClose,
  onSaved,
  onStatusChanged,
}: {
  lot: LotQuality;
  correcting: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
}) {
  const [current, setCurrent] = useState(lot);
  const initial = evaluationFormOf(correcting ? current.evaluation : null);
  const form = useForm<EvaluationFormInput>({
    resolver: zodResolver(evaluationFormSchema),
    defaultValues: initial,
  });
  const { errors } = form.formState;
  const [well, moldy, other] = useWatch({
    control: form.control,
    name: ['well_fermented_pct', 'moldy_pct', 'other_defects_pct'],
  });
  const sum = evaluationSum({
    well_fermented_pct: well,
    moldy_pct: moldy,
    other_defects_pct: other,
  });
  const record = useRecordEvaluation(lot.lot.id);
  const correct = useCorrectEvaluation(lot.lot.id);
  const saving = record.isPending || correct.isPending;
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = qualityFailureOf(
      error,
      correcting ? 'corregir' : 'evaluar',
    );
    if (failure.kind === 'status') return onStatusChanged(failure.message);
    if (failure.kind === 'field') {
      form.setError(failure.field as keyof EvaluationFormInput, {
        type: 'server',
        message: failure.message,
      });
      return;
    }
    if (failure.kind === 'stale' && failure.current) {
      setCurrent(failure.current);
      form.reset(evaluationFormOf(failure.current.evaluation));
    }
    setSummary(failure.message);
  };

  const submit = (values: EvaluationFormInput) => {
    setSummary(undefined);
    if (!correcting) {
      record.mutate(toEvaluationRequest(values, current.lot.version), {
        onSuccess: () => onSaved(EVALUATION_SAVED),
        onError,
      });
      return;
    }
    if (sameValues(values, evaluationFormOf(current.evaluation))) {
      return onSaved(NO_CHANGES);
    }
    correct.mutate(
      toEvaluationCorrection(values, current.evaluation?.version ?? 0),
      { onSuccess: () => onSaved(EVALUATION_UPDATED), onError },
    );
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={lotBrief(current)}
      error={summary}
      isSaving={saving}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      submitDisabled={sum.exceeds}
      submitLabel="Guardar evaluación"
      title={`${correcting ? 'Corregir evaluación' : 'Evaluar'} · ${lot.lot.code}`}
    >
      {PERCENT_FIELDS.map(([name, label]) => {
        const last = name === 'other_defects_pct';
        const error =
          errors[name]?.message ?? (last && sum.exceeds ? sum.line : undefined);
        return (
          <TextField
            disabled={saving}
            error={error}
            hint={last && !error ? sum.line : undefined}
            inputMode="decimal"
            key={name}
            label={label}
            {...form.register(name)}
          />
        );
      })}
      <TextAreaField
        disabled={saving}
        error={errors.notes?.message}
        label="Observaciones (opcional)"
        maxLength={NOTES_MAX_LENGTH}
        rows={3}
        {...form.register('notes')}
      />
    </FormDialog>
  );
}
