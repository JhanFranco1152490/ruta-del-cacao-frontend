'use client';

import type { ComponentProps } from 'react';
import { cn } from 'cn';

import { FormField } from '@/components/form-field';
import { Checkbox } from '@/components/ui/checkbox';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

export type CheckboxFieldProps = Omit<
  ComponentProps<typeof Checkbox>,
  'id' | 'aria-invalid' | 'aria-describedby'
> & {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
  wrapperClassName?: string;
};

export function CheckboxField({
  label,
  hint,
  error,
  id,
  wrapperClassName,
  className,
  ...checkboxProps
}: CheckboxFieldProps) {
  return (
    <FormField
      label={label}
      hint={hint}
      error={error}
      id={id}
      className={cn(
        'grid grid-cols-[auto_1fr] items-center gap-x-3 [&>label]:col-start-2 [&>label]:row-start-1 [&>label]:mb-0 [&>label]:flex [&>label]:min-h-11 [&>label]:items-center [&>p]:col-start-2',
        wrapperClassName,
      )}
    >
      {(control) => (
        <Checkbox
          {...checkboxProps}
          {...control}
          className={cn(
            'col-start-1 row-start-1 size-5 rounded-sm aria-invalid:ring-0 data-disabled:cursor-not-allowed data-disabled:opacity-50',
            FOCUS_OUTLINE_CLASS,
            className,
          )}
        />
      )}
    </FormField>
  );
}
