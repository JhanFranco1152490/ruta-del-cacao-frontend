'use client';

import type { InputHTMLAttributes } from 'react';
import { useId, useState } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

const inputClass =
  'h-13 w-full rounded-xl border bg-[var(--paper)] px-4 text-base text-[var(--chocolate)] shadow-[0_1px_0_rgba(35,24,18,0.04)] transition placeholder:text-[#a69b92] hover:border-[#b8aa9d] focus:border-[var(--forest)] focus:outline-none';

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
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-[var(--forest)]"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? helpId : undefined}
        className={`${inputClass} ${error ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
        {...props}
      />
      {(error || hint) && (
        <p
          id={helpId}
          className={`mt-2 text-sm ${error ? 'text-[var(--error)]' : 'text-[var(--muted)]'}`}
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
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-[var(--forest)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? helpId : undefined}
          className={`${inputClass} pr-24 ${error ? 'border-[var(--error)]' : 'border-[var(--border)]'}`}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-1 my-1 rounded-lg px-3 text-sm font-bold text-[var(--copper)] hover:bg-[#f4e9dd]"
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
          className={`mt-2 text-sm ${error ? 'text-[var(--error)]' : 'text-[var(--muted)]'}`}
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
      className="flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-[var(--forest)] px-5 font-bold text-white shadow-[0_8px_24px_rgba(20,54,42,0.18)] transition hover:bg-[#1c4a3a] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
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
      className={`rounded-xl border px-4 py-3 text-sm leading-6 ${variant === 'error' ? 'border-[#e7b8b3] bg-[#fff3f1] text-[var(--error)]' : 'border-[#b9d7c7] bg-[#eff8f2] text-[var(--success)]'}`}
    >
      {children}
    </div>
  );
}
