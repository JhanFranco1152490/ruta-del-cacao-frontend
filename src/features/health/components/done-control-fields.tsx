'use client';

import { get, useFormContext, useWatch } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { UsedInputsSection } from '@/components/input-usage/used-inputs-section';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import { METHOD_DESCRIPTION_MAX_LENGTH } from '../control-rules';
import { CONTROL_METHOD_OPTIONS } from '../monitoring-rules';
import { useControlChoices } from './control-choices';

// Lo que se hizo contra una detección: qué y, si se aplicó algo, con qué insumos, que se descuentan
// del inventario de la finca. `base` es dónde está el control en el formulario que lo usa
// ("detections.0.control." en la planilla, vacío en el formulario de un control).
export function DoneControlFields({
  base,
  disabled,
}: {
  base: string;
  disabled: boolean;
}) {
  const { control, register, formState } = useFormContext();
  const { catalog, stocks } = useControlChoices();
  const method = useWatch({ control, name: `${base}method` }) as string;
  const errorOf = (field: string) =>
    (
      get(formState.errors, `${base}${field}`) as
        { message?: string } | undefined
    )?.message;

  return (
    <div className="space-y-4">
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        disabled={disabled}
        error={errorOf('method')}
        label="¿Qué hiciste?"
        placeholder="Elige qué hiciste"
        {...register(`${base}method`)}
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
          error={errorOf('method_description')}
          label="Escribe qué hiciste"
          maxLength={METHOD_DESCRIPTION_MAX_LENGTH}
          {...register(`${base}method_description`)}
        />
      )}
      <UsedInputsSection
        catalog={catalog}
        control={control}
        disabled={disabled}
        hint="Si aplicaste algo, agrega el producto y la cantidad. Se descuenta del inventario de la finca."
        name={`${base}inputs`}
        stocks={stocks}
      />
      {errorOf('inputs') && (
        <p className="text-sm font-bold text-err" role="alert">
          {errorOf('inputs')}
        </p>
      )}
    </div>
  );
}
