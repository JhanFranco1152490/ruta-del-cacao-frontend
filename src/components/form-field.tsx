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
  hint?: ReactNode;
  // Algo pequeño junto a la etiqueta (un ícono de ayuda).
  labelAddon?: ReactNode;
  id?: string;
  className?: string;
  // La etiqueta solo para lectores de pantalla, en filtros compactos donde el campo ya dice qué es.
  hideLabel?: boolean;
  children: (control: FieldControl) => ReactNode;
};

// Etiqueta + control + ayuda/error, con los atributos de accesibilidad ya conectados.
export function FormField({
  label,
  error,
  hint,
  labelAddon,
  id: idProp,
  className,
  hideLabel = false,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const helpId = `${id}-help`;
  const help = error || hint;

  return (
    <div className={className}>
      <div className={cn('flex items-center gap-2', hideLabel ? '' : 'mb-2')}>
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-bold text-selva',
            hideLabel && 'sr-only',
          )}
        >
          {label}
        </label>
        {!hideLabel && labelAddon}
      </div>
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
