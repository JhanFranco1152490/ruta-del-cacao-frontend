import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

import { isApiError } from './errors';

export type ApiFieldErrorsResult = {
  applied: boolean;
  // Mensajes de los campos que el formulario no tiene: no quedan en ningún campo, así que
  // quien llama debe mostrarlos en otro lado (un aviso general) o se pierden.
  unmatched: string[];
};

// Vuelca los errores por campo del servidor a react-hook-form. Solo aplica los campos que
// el formulario conoce (el primer mensaje de cada uno); dice si aplicó alguno y devuelve los
// mensajes de los que no conoce.
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  allowed: readonly string[],
): ApiFieldErrorsResult {
  const result: ApiFieldErrorsResult = { applied: false, unmatched: [] };
  if (!isApiError(error)) return result;
  for (const [field, messages] of Object.entries(error.fields)) {
    if (!allowed.includes(field)) {
      result.unmatched.push(...messages);
    } else if (messages[0]) {
      setError(field as FieldPath<T>, { type: 'server', message: messages[0] });
      result.applied = true;
    }
  }
  return result;
}
