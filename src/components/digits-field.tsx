'use client';

import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';

import { TextField, type TextFieldProps } from '@/components/text-field';

// `TTransformed`: lo que entrega el formulario al validar, cuando su esquema convierte los
// valores (por ejemplo, el texto de este campo a número).
type DigitsFieldProps<T extends FieldValues, TTransformed = T> = Omit<
  TextFieldProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error' | 'ref'
> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- el contexto por defecto de react-hook-form es `any`
  control: Control<T, any, TTransformed>;
  name: Path<T>;
};

// Campo numérico (documento, teléfono): descarta todo lo que no sea dígito al escribir.
export function DigitsField<T extends FieldValues, TTransformed = T>({
  control,
  name,
  ...props
}: DigitsFieldProps<T, TTransformed>) {
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
