'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { UsedInputsSection } from '@/components/input-usage/used-inputs-section';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import type { MonitoringFormInput } from '../monitoring-form';
import { CONTROL_METHOD_OPTIONS } from '../monitoring-rules';
import {
  METHOD_DESCRIPTION_MAX_LENGTH,
  type MonitoringFormValues,
} from '../monitoring-schema';
import { useControlChoices } from './control-choices';

// Lo que se hizo en el mismo recorrido: qué y, si se aplicó algo, con qué insumos. Queda como un
// control realizado con la fecha del monitoreo, a nombre de quien lo registra.
export function DoneControlFields({
  index,
  disabled,
}: {
  index: number;
  disabled: boolean;
}) {
  const { control, register, formState } = useFormContext<
    MonitoringFormInput,
    unknown,
    MonitoringFormValues
  >();
  const { catalog, stocks } = useControlChoices();
  const method = useWatch({
    control,
    name: `detections.${index}.control.method`,
  });
  const errors = formState.errors.detections?.[index]?.control;

  return (
    <div className="space-y-4">
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={errors?.method?.message}
        label="¿Qué hiciste?"
        placeholder="Elige qué hiciste"
        {...register(`detections.${index}.control.method`)}
      >
        {CONTROL_METHOD_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectField>
      {method === 'other' && (
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={disabled}
          error={errors?.method_description?.message}
          label="Escribe qué hiciste"
          maxLength={METHOD_DESCRIPTION_MAX_LENGTH}
          {...register(`detections.${index}.control.method_description`)}
        />
      )}
      <UsedInputsSection
        catalog={catalog}
        control={control}
        disabled={disabled}
        hint="Si aplicaste algo, agrega el producto y la cantidad. Se descuenta del inventario de la finca."
        name={`detections.${index}.control.inputs`}
        stocks={stocks}
      />
      {errors?.inputs?.message && (
        <p className="text-sm font-bold text-err" role="alert">
          {errors.inputs.message}
        </p>
      )}
    </div>
  );
}
