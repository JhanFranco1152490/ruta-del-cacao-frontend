'use client';

import { get, useFormContext, useWatch } from 'react-hook-form';

import type { Recommendation } from './recommendations';
import { useSuggestedMethod } from './use-suggested-method';

// Lo que comparten el control hecho y el programado: el método elegido, con lo que recomienda el
// catálogo ya puesto, y el error de cada campo. `base` es dónde está el control en el formulario.
export function useControlMethod(
  base: string,
  recommendation: Recommendation | null,
) {
  const { control, register, formState } = useFormContext();
  const method = useWatch({ control, name: `${base}method` }) as string;
  useSuggestedMethod(base, recommendation?.method ?? null);
  const errorOf = (field: string) =>
    (
      get(formState.errors, `${base}${field}`) as
        { message?: string } | undefined
    )?.message;
  return { control, register, method, errorOf };
}
