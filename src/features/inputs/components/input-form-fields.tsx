'use client';

import type { ReactNode } from 'react';
import type { FieldErrors, UseFormReturn } from 'react-hook-form';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

import {
  INPUT_TYPE_OPTIONS,
  INPUT_UNIT_OPTIONS,
  inputUnitLabel,
  PACKAGE_TYPE_OPTIONS,
  UNIT_SYMBOLS,
  type InputUnit,
} from '../input-options';
import { UNIT_LOCKED_HINT } from '../input-form-values';
import {
  INPUT_NAME_MAX_LENGTH,
  type InputFormInput,
  type InputFormValues,
} from '../schemas';

export function InputFormFields({
  form,
  errors,
  disabled,
  unitLocked,
  extra,
}: {
  form: UseFormReturn<InputFormInput, unknown, InputFormValues>;
  errors: FieldErrors<InputFormInput>;
  disabled: boolean;
  unitLocked: boolean;
  // Lo que el diálogo agrega junto al nombre (el aviso de un nombre repetido).
  extra?: ReactNode;
}) {
  const { register, watch } = form;
  const unit = watch('unit');
  const packageType = watch('package_type');
  const symbol = unit ? UNIT_SYMBOLS[unit as InputUnit]?.plural : undefined;

  return (
    <>
      <TextField
        autoFocus
        disabled={disabled}
        error={errors.name?.message}
        hint="Por ejemplo, Urea 46 % u Oxicloruro de cobre."
        label="Nombre"
        maxLength={INPUT_NAME_MAX_LENGTH}
        {...register('name')}
      />
      {extra}
      <SelectField
        disabled={disabled}
        error={errors.input_type?.message}
        label="Tipo de insumo"
        {...register('input_type')}
      >
        <option value="">Elige un tipo</option>
        {INPUT_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      {unitLocked ? (
        // Sin registrar en el formulario: un campo deshabilitado no viaja en los valores, y la
        // unidad que se envía es la que ya tiene el insumo.
        <SelectField
          disabled
          hint={UNIT_LOCKED_HINT}
          label="Unidad de medida"
          value={unit}
        >
          <option value={unit}>{inputUnitLabel(unit)}</option>
        </SelectField>
      ) : (
        <SelectField
          disabled={disabled}
          error={errors.unit?.message}
          hint="En ella se cuentan las existencias y lo que gasta cada labor."
          label="Unidad de medida"
          {...register('unit')}
        >
          <option value="">Elige una unidad</option>
          {INPUT_UNIT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      )}
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-selva">
          Presentación (opcional)
        </legend>
        <SelectField
          disabled={disabled}
          error={errors.package_type?.message}
          hint="Cómo se compra: sirve para registrar compras sin hacer cuentas."
          label="Empaque"
          {...register('package_type', {
            // Sin empaque no hay contenido: si quedara escrito y oculto, el formulario pediría un
            // empaque que la persona acaba de quitar.
            onChange: (event: { target: { value: string } }) => {
              if (!event.target.value) form.setValue('package_size', '');
            },
          })}
        >
          <option value="">Sin presentación</option>
          {PACKAGE_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        {packageType && (
          <TextField
            disabled={disabled}
            error={errors.package_size?.message}
            hint={
              symbol
                ? `En ${symbol}, la unidad del insumo. Por ejemplo, 100.`
                : 'En la unidad del insumo: elígela primero.'
            }
            inputMode="decimal"
            label={symbol ? `Contenido (${symbol})` : 'Contenido'}
            {...register('package_size')}
          />
        )}
      </fieldset>
    </>
  );
}
