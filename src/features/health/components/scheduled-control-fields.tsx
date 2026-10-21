'use client';

import { useMemo } from 'react';
import { Controller, get, useFormContext, useWatch } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SearchSelect } from '@/components/search-select';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import { METHOD_DESCRIPTION_MAX_LENGTH } from '../control-rules';
import { CONTROL_METHOD_OPTIONS } from '../monitoring-rules';
import { methodHint, type Recommendation } from '../recommendations';
import { ControlAssigneeField } from './control-assignee-field';
import { useControlChoices } from './control-choices';
import { useSuggestedMethod } from './use-suggested-method';

// Un control para después: cuándo y quién, y si ya se sabe, qué se va a hacer y con qué insumo. El
// insumo previsto es solo una referencia para quien lo aplique: no descuenta nada. `base` es dónde
// está el control en el formulario que lo usa.
export function ScheduledControlFields({
  base,
  disabled,
  recommendation = null,
}: {
  base: string;
  disabled: boolean;
  // Lo que el catálogo recomienda para la plaga que se atiende.
  recommendation?: Recommendation | null;
}) {
  const { control, register, formState } = useFormContext();
  const { catalog, today } = useControlChoices();
  const method = useWatch({ control, name: `${base}method` }) as string;
  useSuggestedMethod(base, recommendation?.method ?? null);
  const errorOf = (field: string) =>
    (
      get(formState.errors, `${base}${field}`) as
        { message?: string } | undefined
    )?.message;
  const inputOptions = useMemo(
    () => (catalog ?? []).map(({ id, name }) => ({ id, label: name })),
    [catalog],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          className={CAPTURE_FIELD_CLASS}
          disabled={disabled}
          error={errorOf('scheduled_date')}
          label="Fecha programada"
          min={today}
          type="date"
          {...register(`${base}scheduled_date`)}
        />
        <ControlAssigneeField disabled={disabled} name={`${base}assignee_id`} />
      </div>
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        hint={methodHint(recommendation, method)}
        label="¿Qué se va a hacer? (opcional)"
        {...register(`${base}method`)}
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
          error={errorOf('method_description')}
          label="Escribe qué se va a hacer"
          maxLength={METHOD_DESCRIPTION_MAX_LENGTH}
          {...register(`${base}method_description`)}
        />
      )}
      <Controller
        control={control}
        name={`${base}planned_input_id`}
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
