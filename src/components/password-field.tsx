'use client';

import { useState } from 'react';
import { cn } from 'cn';

import { FormField } from '@/components/form-field';
import {
  FIELD_INPUT_CLASS,
  type TextFieldProps,
} from '@/components/text-field';
import { Input } from '@/components/ui/input';

type PasswordFieldProps = Omit<TextFieldProps, 'type'>;

export function PasswordField({
  label,
  error,
  hint,
  id,
  wrapperClassName,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      id={id}
      className={wrapperClassName}
    >
      {(control) => (
        <div className="relative">
          <Input
            {...control}
            type={visible ? 'text' : 'password'}
            className={cn(FIELD_INPUT_CLASS, 'pr-24', className)}
            {...inputProps}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-1 my-1 rounded-lg px-3 text-sm font-bold text-cobre hover:bg-muted"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      )}
    </FormField>
  );
}
