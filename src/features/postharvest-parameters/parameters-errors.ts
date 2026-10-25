import type { UseFormSetError } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import { PARAMETERS_ERROR } from './api';
import { PARAMETER_KEYS, type ParametersFormInput } from './parameter-fields';

export const STALE_MESSAGE =
  'Otra persona cambió los parámetros. Revisa los valores actuales antes de guardar.';
export const REVIEW_MESSAGE = 'Revisa los valores marcados.';

// Por qué no se guardó o no se restableció.
export function saveErrorMessage(error: unknown) {
  if (!isApiError(error)) {
    return 'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.';
  }
  if (error.code === PARAMETERS_ERROR.staleVersion) return STALE_MESSAGE;
  return getErrorMessage(error, 'No fue posible guardar los parámetros.');
}

// El rechazo al guardar: lo que es de un campo va junto a él (un valor fuera de rango, un mínimo
// mayor que el máximo) y el resumen de arriba dice que se revisen; lo demás se dice arriba.
export function saveFailureSummary(
  error: unknown,
  setError: UseFormSetError<ParametersFormInput>,
): string {
  if (applyApiFieldErrors(error, setError, PARAMETER_KEYS).applied) {
    return REVIEW_MESSAGE;
  }
  return saveErrorMessage(error);
}
