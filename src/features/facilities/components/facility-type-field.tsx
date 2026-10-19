'use client';

import type { UseFormRegisterReturn } from 'react-hook-form';

import { FACILITY_TYPE_ORDER, FACILITY_TYPES } from '@/lib/facility-labels';

// El tipo se elige con dos tarjetas con ícono: dicen para qué sirve cada uno. Con `lockedHint` se
// ven deshabilitadas y dicen por qué.
export function FacilityTypeField({
  field,
  error,
  disabled,
  lockedHint,
}: {
  field: UseFormRegisterReturn<'facility_type'>;
  error?: string;
  disabled: boolean;
  lockedHint?: string;
}) {
  const describedBy = error
    ? 'facility-type-error'
    : lockedHint
      ? 'facility-type-hint'
      : undefined;
  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={Boolean(error)}
      disabled={disabled || Boolean(lockedHint)}
    >
      <legend className="mb-2 font-bold text-selva">Tipo</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {FACILITY_TYPE_ORDER.map((type) => {
          const { Icon, purpose } = FACILITY_TYPES[type];
          return (
            <label
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-(--radius) border bg-card p-3 font-bold has-checked:border-selva has-checked:bg-surface-alt has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-cobre has-disabled:cursor-not-allowed has-disabled:opacity-60"
              key={type}
            >
              <input className="sr-only" type="radio" value={type} {...field} />
              <Icon aria-hidden="true" className="size-6 shrink-0 text-selva" />
              {purpose}
            </label>
          );
        })}
      </div>
      {lockedHint && !error && (
        <p
          className="mt-1 text-sm text-muted-foreground"
          id="facility-type-hint"
        >
          {lockedHint}
        </p>
      )}
      {error && (
        <p
          className="mt-1 text-sm font-bold text-err"
          id="facility-type-error"
          role="alert"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
