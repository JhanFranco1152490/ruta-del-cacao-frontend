'use client';

import {
  type Control,
  Controller,
  type FieldErrors,
  type UseFormRegister,
  useWatch,
} from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { CheckboxField } from '@/components/checkbox-field';
import { FormSection } from '@/components/form-section';
import { SegmentedControl } from '@/components/segmented-control';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import type { MonitoringFormInput } from '../monitoring-form';
import {
  SAMPLING_METHOD_OPTIONS,
  SAMPLING_UNITS,
  type SamplingUnit,
} from '../monitoring-rules';
import type { MonitoringFormValues } from '../monitoring-schema';

const UNIT_OPTIONS = (Object.keys(SAMPLING_UNITS) as SamplingUnit[]).map(
  (value) => ({ value, label: SAMPLING_UNITS[value].option }),
);

// Cuándo se hizo, qué se contó y cuántas unidades, y si no se encontró nada.
export function SamplingFields({
  control,
  register,
  errors,
  today,
  disabled,
  plotTrees = null,
}: {
  control: Control<MonitoringFormInput, unknown, MonitoringFormValues>;
  register: UseFormRegister<MonitoringFormInput>;
  errors: FieldErrors<MonitoringFormInput>;
  today: string;
  disabled: boolean;
  // Los árboles que suma la ficha de la parcela, si se saben.
  plotTrees?: number | null;
}) {
  const unit = useWatch({ control, name: 'sampling_unit' });
  return (
    <FormSection title="Muestreo">
      <div className="space-y-5">
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={disabled}
          error={errors.done_date?.message}
          label="Fecha de realización"
          max={today}
          type="date"
          {...register('done_date')}
        />
        <div className="space-y-2">
          <p aria-hidden="true" className="text-sm font-bold">
            ¿Qué evaluaste?
          </p>
          <Controller
            control={control}
            name="sampling_unit"
            render={({ field }) => (
              <SegmentedControl
                label="¿Qué evaluaste?"
                onChange={field.onChange}
                options={UNIT_OPTIONS}
                value={field.value}
              />
            )}
          />
        </div>
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={disabled}
          error={errors.evaluated_units?.message}
          hint={
            unit === 'trees' && plotTrees !== null
              ? `La parcela tiene ${plotTrees} ${plotTrees === 1 ? 'árbol' : 'árboles'} según su ficha.`
              : undefined
          }
          inputMode="numeric"
          label="Unidades evaluadas"
          {...register('evaluated_units')}
        />
        <SelectField
          className={CAPTURE_FIELD_CLASS}
          disabled={disabled}
          label="Método de muestreo (opcional)"
          {...register('sampling_method')}
        >
          <option value="">Sin indicar</option>
          {SAMPLING_METHOD_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <Controller
          control={control}
          name="no_presence"
          render={({ field }) => (
            <CheckboxField
              checked={field.value}
              disabled={disabled}
              hint="Marcada, no se registran detecciones ni controles."
              label="Sin presencia de plagas ni enfermedades"
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
      </div>
    </FormSection>
  );
}
