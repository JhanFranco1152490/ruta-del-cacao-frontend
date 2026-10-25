'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

import { TextField } from '@/components/text-field';

import { type ParameterKey, unitOf } from '../parameter-fields';
import { ChangedMark } from './changed-mark';

// Un campo de parámetro: la etiqueta con su unidad, el valor predeterminado debajo como referencia y la marca
// «Cambiado» si ya no es el predeterminado. Los porcentajes y las horas aceptan coma o punto.
export function ParameterInput({
  name,
  label,
  register,
  error,
  baselineText,
  changed,
  disabled,
}: {
  name: ParameterKey;
  label: string;
  register: UseFormRegisterReturn<ParameterKey>;
  error?: string;
  baselineText: string;
  changed: boolean;
  disabled: boolean;
}) {
  const unit = unitOf(name);
  return (
    <div className="min-w-0 space-y-1">
      <TextField
        disabled={disabled}
        error={error}
        hint={baselineText}
        inputMode={unit === '%' ? 'decimal' : 'numeric'}
        label={`${label} (${unit})`}
        {...register}
      />
      {changed && <ChangedMark />}
    </div>
  );
}
