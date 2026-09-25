'use client';

import { useId, type ReactNode } from 'react';
import { cn } from 'cn';

export type FieldControl = {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
};

type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  id?: string;
  className?: string;
  children: (control: FieldControl) => ReactNode;
};

// Etiqueta + control + ayuda/error, con los atributos de accesibilidad ya conectados.
export function FormField({
  label,
  error,
  hint,
  id: idProp,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const helpId = `${id}-help`;
  const help = error || hint;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-selva">
        {label}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': help ? helpId : undefined,
      })}
      {help && (
        <p
          id={helpId}
          role={error ? 'alert' : undefined}
          className={cn(
            'mt-2 text-sm',
            error ? 'text-err' : 'text-muted-foreground',
          )}
        >
          {help}
        </p>
      )}
    </div>
  );
}
