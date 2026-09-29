import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

const FIELD_ERRORS: Record<string, [field: string, message: string]> = {
  duplicate_email: ['email', 'Ya existe una cuenta con este correo.'],
  duplicate_document: [
    'identity_document',
    'Ya existe una cuenta con este documento.',
  ],
  exceeds_own_permissions: [
    'role_ids',
    'No puedes asignar todos los roles seleccionados.',
  ],
};

// Errores sin campo propio: el texto se decide por el `code`, nunca por el `detail`.
const GENERAL_ERRORS: Record<string, string> = {
  producer_already_linked:
    'Este productor ya tiene una cuenta de acceso. Recarga la ficha.',
  producer_inactive:
    'El productor está inactivo: reactívalo antes de crear su cuenta.',
};

// Lleva cada error a su campo según el `code` y devuelve el aviso general que quede, o ''
// si todo quedó en algún campo. Lo que el formulario no tiene (por ejemplo el documento en
// una cuenta Productor) termina en el aviso general para que no se pierda.
export function presentAccountError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
  messages: { forbidden: string; fallback: string },
) {
  if (!isApiError(error)) return messages.fallback;
  const known = FIELD_ERRORS[error.code];
  if (known) {
    const [field, message] = known;
    if (fields.includes(field)) {
      setError(field as FieldPath<T>, { type: 'server', message });
      return '';
    }
    return message;
  }
  if (GENERAL_ERRORS[error.code]) return GENERAL_ERRORS[error.code];
  const result = applyApiFieldErrors(error, setError, fields);
  if (result.applied && !result.unmatched.length) return '';
  if (result.unmatched.length) return result.unmatched.join(' ');
  return error.code === 'permission_denied'
    ? messages.forbidden
    : getErrorMessage(error, messages.fallback);
}
