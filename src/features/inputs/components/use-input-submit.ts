'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import {
  type AgriculturalInput,
  currentInputOf,
  duplicateInputOf,
  type ExistingInput,
  INPUT_ERROR,
  type useCreateAgriculturalInput,
  type useUpdateAgriculturalInput,
} from '../api';
import {
  formValuesOf,
  INPUT_ACTIVATED_MESSAGE,
  INPUT_SAVED_MESSAGE,
  INPUT_UPDATED_MESSAGE,
  STALE_INPUT_MESSAGE,
  UNIT_LOCKED_HINT,
} from '../input-form-values';
import {
  DUPLICATE_INPUT_MESSAGE,
  type InputFormInput,
  type InputFormValues,
} from '../schemas';

const FIELDS = [
  'name',
  'input_type',
  'unit',
  'package_type',
  'package_size',
] as const;

const SAVE_FAILED_MESSAGE =
  'No fue posible guardar el insumo. Revisa tu conexión e inténtalo nuevamente.';

// Envía el formulario de un insumo y traduce cada respuesta de error a lo que ve la persona. Ante
// cualquier error el formulario conserva lo escrito, salvo con una versión obsoleta: ahí se cargan
// los valores vigentes, porque guardar sobre ellos sin verlos pisaría el cambio de otra persona.
export function useInputSubmit({
  input,
  form,
  producerId,
  create,
  update,
  onSaved,
}: {
  input?: AgriculturalInput;
  form: UseFormReturn<InputFormInput, unknown, InputFormValues>;
  // Solo para la cuenta técnica al registrar.
  producerId: string | null;
  create: ReturnType<typeof useCreateAgriculturalInput>;
  update: ReturnType<typeof useUpdateAgriculturalInput>;
  onSaved: (message: string) => void;
}) {
  const [summary, setSummary] = useState<string>();
  const [existing, setExisting] = useState<ExistingInput>();
  const [version, setVersion] = useState(input?.version);
  const [unitLocked, setUnitLocked] = useState(!!input?.has_records);

  const showError = (error: unknown) => {
    const duplicate = duplicateInputOf(error);
    if (duplicate) {
      setExisting(duplicate);
      form.setError('name', {
        type: 'server',
        message: DUPLICATE_INPUT_MESSAGE,
      });
      return;
    }
    const current = currentInputOf(error);
    if (current) {
      setVersion(current.version);
      setUnitLocked(current.has_records);
      form.reset(formValuesOf(current));
      setSummary(STALE_INPUT_MESSAGE);
      return;
    }
    if (isApiError(error) && error.code === INPUT_ERROR.unitLocked && input) {
      setUnitLocked(true);
      form.setValue('unit', input.unit);
      setSummary(`${UNIT_LOCKED_HINT}.`);
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

  const submit = async (values: InputFormValues) => {
    setSummary(undefined);
    setExisting(undefined);
    try {
      if (input) {
        await update.mutateAsync({
          id: input.id,
          body: { ...values, expected_version: version ?? input.version },
        });
        onSaved(INPUT_UPDATED_MESSAGE);
      } else {
        await create.mutateAsync(
          producerId ? { ...values, producer_id: producerId } : values,
        );
        onSaved(INPUT_SAVED_MESSAGE);
      }
    } catch (error) {
      showError(error);
    }
  };

  // Activa el insumo inactivo que tiene el nombre repetido. Devuelve si lo logró.
  const activate = async (known: AgriculturalInput) => {
    setSummary(undefined);
    try {
      await update.mutateAsync({
        id: known.id,
        body: { is_active: true, expected_version: known.version },
      });
      onSaved(INPUT_ACTIVATED_MESSAGE);
      return true;
    } catch (error) {
      setSummary(getErrorMessage(error, 'No fue posible activar el insumo.'));
      return false;
    }
  };

  return { submit, activate, summary, setSummary, existing, unitLocked };
}
