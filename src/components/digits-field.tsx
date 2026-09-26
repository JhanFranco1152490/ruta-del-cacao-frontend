'use client';

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';

import { TextField, type TextFieldProps } from '@/components/text-field';

type DigitsFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'ref'
> & {
  control: Control<T>;
  name: Path<T>;
};

// Campo numérico (documento, teléfono): descarta todo lo que no sea dígito al escribir.
export function DigitsField<T extends FieldValues>({
  control,
  name,
  ...props
}: DigitsFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...props}
          name={field.name}
          ref={field.ref}
          value={field.value ?? ''}
          onBlur={field.onBlur}
          onChange={(event) =>
            field.onChange(event.target.value.replace(/\D/g, ''))
          }
          error={fieldState.error?.message}
          inputMode="numeric"
        />
      )}
    />
  );
}
