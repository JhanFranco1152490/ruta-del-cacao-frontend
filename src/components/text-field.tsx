'use client';

import type { ComponentProps } from 'react';
import { cn } from 'cn';

import { FormField } from '@/components/form-field';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { Input } from '@/components/ui/input';

// Aspecto de campo de la app (radio de 10 px, texto de 16 px, error marcado solo con el borde
// y foco con el anillo cobre): el Input base trae otro radio, texto de 14 px desde md, un halo
// rojo en error y un halo de foco que no se ve en error.
export const FIELD_INPUT_CLASS = cn(
  'h-11 rounded-md border-input bg-card px-3 text-base md:text-base aria-invalid:ring-0',
  FOCUS_OUTLINE_CLASS,
);

export type TextFieldProps = Omit<
  ComponentProps<typeof Input>,
  'id' | 'aria-invalid' | 'aria-describedby'
> & {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  wrapperClassName?: string;
};

export function TextField({
  label,
  error,
  hint,
  id,
  wrapperClassName,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      id={id}
      className={wrapperClassName}
    >
      {(control) => (
        <Input
          {...control}
          className={cn(FIELD_INPUT_CLASS, className)}
          {...inputProps}
        />
      )}
    </FormField>
  );
}
