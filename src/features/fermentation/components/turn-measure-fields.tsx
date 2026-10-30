'use client';

import type { Control, UseFormRegister } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { TextField } from '@/components/text-field';

import {
  phHint,
  type ReferenceRange,
  temperatureHint,
} from '../reference-hint';
import type { TurnFormInput, TurnFormValues } from '../turn-form';

// Lo que se mide va en grande y centrado: se lee a un brazo de distancia, con el medidor en la otra
// mano.
const MEASURE_FIELD_CLASS = `${CAPTURE_FIELD_CLASS} text-center text-xl font-bold tabular-nums`;

// La temperatura y el pH del volteo, lado a lado, con la referencia del productor debajo. Sin
// referencia (una copia anterior a los parámetros) queda la ayuda de siempre.
export function TurnMeasureFields({
  control,
  register,
  errors,
  isSaving,
  reference,
}: {
  control: Control<TurnFormInput, unknown, TurnFormValues>;
  register: UseFormRegister<TurnFormInput>;
  errors: { temperature_c?: { message?: string }; ph?: { message?: string } };
  isSaving: boolean;
  reference?: { temperature: ReferenceRange; ph: ReferenceRange };
}) {
  const [temperature, ph] = useWatch({
    control,
    name: ['temperature_c', 'ph'],
  });
  return (
    <>
      <TextField
        className={MEASURE_FIELD_CLASS}
        disabled={isSaving}
        error={errors.temperature_c?.message}
        hint={
          reference
            ? temperatureHint(temperature, reference.temperature)
            : 'En el centro de la masa.'
        }
        inputMode="decimal"
        label="Temperatura (°C)"
        {...register('temperature_c')}
      />
      <TextField
        className={MEASURE_FIELD_CLASS}
        disabled={isSaving}
        error={errors.ph?.message}
        hint={reference ? phHint(ph, reference.ph) : undefined}
        inputMode="decimal"
        label="pH del grano"
        {...register('ph')}
      />
    </>
  );
}
