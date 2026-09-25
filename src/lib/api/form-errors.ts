import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

import { isApiError } from './errors';

// Vuelca los errores por campo del servidor a react-hook-form. Solo aplica los campos que
// el formulario conoce; devuelve false si no aplicó ninguno, para que quien llama muestre
// el aviso general en su lugar.
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  allowed: readonly string[],
) {
  if (!isApiError(error)) return false;
  let applied = false;
  for (const [field, messages] of Object.entries(error.fields)) {
    if (!allowed.includes(field) || !messages[0]) continue;
    setError(field as FieldPath<T>, { type: 'server', message: messages[0] });
    applied = true;
  }
  return applied;
}
