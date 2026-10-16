'use client';

import { useMemo } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SearchSelect } from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import type { MonitoringFormInput } from '../monitoring-form';
import { CONTROL_METHOD_OPTIONS } from '../monitoring-rules';
import {
  METHOD_DESCRIPTION_MAX_LENGTH,
  type MonitoringFormValues,
} from '../monitoring-schema';
import { useControlChoices } from './control-choices';

// Un control para después: cuándo y quién, y si ya se sabe, qué se va a hacer y con qué insumo. El
// insumo previsto es solo una referencia para quien lo aplique: no descuenta nada.
export function ScheduledControlFields({
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
  const { assignees, catalog, today } = useControlChoices();
  const method = useWatch({
    control,
    name: `detections.${index}.control.method`,
  });
  const errors = formState.errors.detections?.[index]?.control;
  const inputOptions = useMemo(
    () => (catalog ?? []).map(({ id, name }) => ({ id, label: name })),
    [catalog],
  );

  return (
    <div className="space-y-4">
      <TextField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={errors?.scheduled_date?.message}
        label="Fecha programada"
        min={today}
        type="date"
        {...register(`detections.${index}.control.scheduled_date`)}
      />
      <Controller
        control={control}
        name={`detections.${index}.control.assignee_id`}
        render={({ field }) => (
          <SearchSelect
            disabled={disabled}
            error={errors?.assignee_id?.message}
            inputClassName={CAPTURE_FIELD_CLASS}
            label="Responsable"
            onBlur={field.onBlur}
            onChange={(option) => field.onChange(option?.id ?? '')}
            options={assignees}
            placeholder="Elige quién lo hará"
            value={assignees.find(({ id }) => id === field.value) ?? null}
          />
        )}
      />
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        label="¿Qué se va a hacer? (opcional)"
        {...register(`detections.${index}.control.method`)}
      >
        <option value="">Se decide después</option>
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
          label="Escribe qué se va a hacer"
          maxLength={METHOD_DESCRIPTION_MAX_LENGTH}
          {...register(`detections.${index}.control.method_description`)}
        />
      )}
      <Controller
        control={control}
        name={`detections.${index}.control.planned_input_id`}
        render={({ field }) => (
          <SearchSelect
            disabled={disabled}
            hint="Una referencia para quien lo aplique: no se descuenta del inventario."
            inputClassName={CAPTURE_FIELD_CLASS}
            label="Insumo previsto (opcional)"
            onBlur={field.onBlur}
            onChange={(option) => field.onChange(option?.id ?? '')}
            options={inputOptions}
            placeholder="Escribe para buscar un insumo"
            value={inputOptions.find(({ id }) => id === field.value) ?? null}
          />
        )}
      />
    </div>
  );
}
