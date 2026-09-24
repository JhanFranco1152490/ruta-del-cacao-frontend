'use client';

import type { InputHTMLAttributes } from 'react';
import { useId, useState } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

const inputClass =
  'h-13 w-full rounded-xl border bg-card px-4 text-base text-foreground transition placeholder:text-muted-foreground hover:border-input focus:border-selva focus:outline-none';

export function Field({
  label,
  error,
  hint,
  id: providedId,
  className = '',
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helpId = `${id}-help`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-selva">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? helpId : undefined}
        className={`${inputClass} ${error ? 'border-err' : 'border-input'}`}
        {...props}
      />
      {(error || hint) && (
        <p
          id={helpId}
          className={`mt-2 text-sm ${error ? 'text-err' : 'text-muted-foreground'}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField({
  label,
  error,
  hint,
  id: providedId,
  className = '',
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helpId = `${id}-help`;
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-selva">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? helpId : undefined}
          className={`${inputClass} pr-24 ${error ? 'border-err' : 'border-input'}`}
          {...props}
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
      {(error || hint) && (
        <p
          id={helpId}
          className={`mt-2 text-sm ${error ? 'text-err' : 'text-muted-foreground'}`}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-selva px-5 font-bold text-primary-foreground transition hover:bg-selva-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
          aria-hidden="true"
        />
      )}
      {pending ? 'Procesando…' : children}
    </button>
  );
}

export function FormMessage({
  children,
  variant = 'error',
}: {
  children?: string;
  variant?: 'error' | 'success';
}) {
  if (!children) return null;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${variant === 'error' ? 'border-err/30 bg-err-bg text-err' : 'border-ok/30 bg-ok-bg text-ok'}`}
    >
      {children}
    </div>
  );
}
