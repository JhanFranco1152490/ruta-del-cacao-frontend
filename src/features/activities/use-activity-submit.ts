'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { serverErrorSummary } from '@/lib/api/form-errors';

import {
  ACTIVITY_ERROR,
  type AgriculturalActivity,
  currentActivityOf,
  type useCreateActivity,
  type useUpdateActivity,
} from './api';
import {
  type ActivityFormInput,
  type ActivityFormValues,
  toCreateRequest,
  toFormValues,
  toUpdateRequest,
} from './schemas';

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

// La actividad dejó de poder editarse mientras el formulario estaba abierto: no hay nada que
// corregir en él.
const CLOSING_CODES: readonly string[] = [
  ACTIVITY_ERROR.alreadyDone,
  ACTIVITY_ERROR.overdue,
];

export const ACTIVITY_SCHEDULED_MESSAGE = 'Actividad programada';
export const ACTIVITY_UPDATED_MESSAGE = 'Actividad actualizada';
export const STALE_ACTIVITY_MESSAGE =
  'Otra persona cambió esta actividad. Revisa los datos actuales antes de guardar.';
const SAVE_FAILED_MESSAGE =
  'No fue posible guardar la actividad. Revisa tu conexión e inténtalo nuevamente.';

// Envía el formulario de una actividad y traduce cada respuesta de error a lo que ve la persona:
// junto a su campo cuando se corrige ahí, o en un aviso general. El formulario conserva lo
// escrito, salvo con una versión obsoleta: ahí se cargan los valores vigentes, porque guardar
// sobre ellos sin verlos pisaría el cambio de otra persona.
export function useActivitySubmit({
  form,
  activityId,
  current,
  onCurrent,
  create,
  update,
  onSaved,
  onUnchanged,
  onRejected,
}: {
  form: UseFormReturn<ActivityFormInput, unknown, ActivityFormValues>;
  // El id de la actividad nueva, generado al abrir el formulario.
  activityId: string;
  // La actividad que se edita, como está en el servidor; sin ella, se programa una nueva.
  current?: AgriculturalActivity;
  // Otra persona la cambió: llega la versión vigente.
  onCurrent: (activity: AgriculturalActivity) => void;
  create: ReturnType<typeof useCreateActivity>;
  update: ReturnType<typeof useUpdateActivity>;
  onSaved: (activity: AgriculturalActivity, message: string) => void;
  // Se guardó sin cambiar nada: no hay petición ni nada que anunciar.
  onUnchanged: () => void;
  // La actividad ya no se puede editar: el formulario se cierra con el motivo.
  onRejected: (message: string) => void;
}) {
  const [summary, setSummary] = useState<string>();

  const showError = (error: unknown) => {
    const fresh = currentActivityOf(error);
    if (fresh) {
      onCurrent(fresh);
      form.reset(toFormValues(fresh));
      setSummary(STALE_ACTIVITY_MESSAGE);
      return;
    }
    if (isApiError(error) && CLOSING_CODES.includes(error.code)) {
      onRejected(getErrorMessage(error, SAVE_FAILED_MESSAGE));
      return;
    }
    const field = isApiError(error) ? FIELD_BY_CODE[error.code] : undefined;
    if (field) {
      form.setError(field, {
        type: 'server',
        message: getErrorMessage(error, SAVE_FAILED_MESSAGE),
      });
      return;
    }
    setSummary(
      serverErrorSummary(error, form.setError, FIELDS, SAVE_FAILED_MESSAGE),
    );
  };

  const submit = async (values: ActivityFormValues) => {
    setSummary(undefined);
    try {
      if (!current) {
        const created = await create.mutateAsync(
          toCreateRequest(values, activityId),
        );
        onSaved(created, ACTIVITY_SCHEDULED_MESSAGE);
        return;
      }
      const body = toUpdateRequest(values, current);
      if (!body) return onUnchanged();
      const updated = await update.mutateAsync({ id: current.id, body });
      onSaved(updated, ACTIVITY_UPDATED_MESSAGE);
    } catch (error) {
      showError(error);
    }
  };

  return { submit, summary, setSummary };
}
