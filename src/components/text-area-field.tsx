'use client';

import type { ComponentProps } from 'react';
import { cn } from 'cn';

import { FormField } from '@/components/form-field';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { Textarea } from '@/components/ui/textarea';

// El mismo aspecto que `TextField` (radio de 10 px, texto de 16 px, error marcado solo con el borde
// y foco con el anillo cobre), para un texto de varias líneas: una descripción, unas observaciones.
const TEXT_AREA_CLASS = cn(
  'min-h-24 rounded-md border-input bg-card px-3 py-2 text-base md:text-base aria-invalid:ring-0',
  FOCUS_OUTLINE_CLASS,
);

export type TextAreaFieldProps = Omit<
  ComponentProps<typeof Textarea>,
  'id' | 'aria-invalid' | 'aria-describedby'
> & {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  wrapperClassName?: string;
};

export function TextAreaField({
  label,
  error,
  hint,
  id,
  wrapperClassName,
  className,
  ...textAreaProps
}: TextAreaFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      id={id}
      className={wrapperClassName}
    >
      {(control) => (
        <Textarea
          {...control}
          className={cn(TEXT_AREA_CLASS, className)}
          {...textAreaProps}
        />
      )}
    </FormField>
  );
}
