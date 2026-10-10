'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import {
  ACTIVITY_ERROR,
  type AgriculturalActivity,
  type useCreateActivity,
} from '../api';
import {
  type ActivityFormInput,
  type ActivityFormValues,
  toCreateRequest,
} from '../schemas';

const FIELDS = [
  'plot_id',
  'activity_type',
  'other_description',
  'scheduled_date',
  'assignee_id',
] as const;

// Errores que el servidor no ata a un campo, pero que la persona corrige en uno.
const FIELD_BY_CODE: Record<string, keyof ActivityFormInput> = {
  [ACTIVITY_ERROR.plotInactive]: 'plot_id',
  [ACTIVITY_ERROR.farmInactive]: 'farm_id',
};

const SAVE_FAILED_MESSAGE =
  'No fue posible guardar la actividad. Revisa tu conexión e inténtalo nuevamente.';

// Envía el formulario de una actividad y traduce cada respuesta de error a lo que ve la persona:
// junto a su campo cuando se corrige ahí, o en un aviso general. El formulario conserva lo escrito.
export function useActivitySubmit({
  form,
  activityId,
  create,
  onSaved,
}: {
  form: UseFormReturn<ActivityFormInput, unknown, ActivityFormValues>;
  // El id de la actividad nueva, generado al abrir el formulario.
  activityId: string;
  create: ReturnType<typeof useCreateActivity>;
  onSaved: (activity: AgriculturalActivity) => void;
}) {
  const [summary, setSummary] = useState<string>();

  const showError = (error: unknown) => {
    const field = isApiError(error) ? FIELD_BY_CODE[error.code] : undefined;
    if (field) {
      form.setError(field, {
        type: 'server',
        message: getErrorMessage(error, SAVE_FAILED_MESSAGE),
      });
      return;
    }
    const { applied, unmatched } = applyApiFieldErrors(
      error,
      form.setError,
      FIELDS,
    );
    if (applied && unmatched.length === 0) return;
    setSummary(unmatched[0] ?? getErrorMessage(error, SAVE_FAILED_MESSAGE));
  };

  const submit = async (values: ActivityFormValues) => {
    setSummary(undefined);
    try {
      onSaved(await create.mutateAsync(toCreateRequest(values, activityId)));
    } catch (error) {
      showError(error);
    }
  };

  return { submit, summary, setSummary };
}
