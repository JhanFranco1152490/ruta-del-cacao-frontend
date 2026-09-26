'use client';

import type { ComponentProps } from 'react';

import { FormField } from '@/components/form-field';
import { NativeSelect } from '@/components/ui/native-select';

type SelectFieldProps = Omit<
  ComponentProps<typeof NativeSelect>,
  'id' | 'aria-invalid' | 'aria-describedby'
> & {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  wrapperClassName?: string;
};

export function SelectField({
  label,
  error,
  hint,
  id,
  wrapperClassName,
  className,
  children,
  ...selectProps
}: SelectFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      id={id}
      className={wrapperClassName}
    >
      {(control) => (
        <NativeSelect {...control} className={className} {...selectProps}>
          {children}
        </NativeSelect>
      )}
    </FormField>
  );
}
