import type { UseFormSetError } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import { DRYING_ERROR } from './api';
import type { LogFormInput } from './log-form';

export const SAVE_LOG_FAILED =
  'No fue posible guardar la bitácora en el dispositivo. Inténtalo nuevamente.';

// El error de la fecha repetida: el campo ofrece ver la bitácora que ya existe.
export const DUPLICATE_ERROR = 'duplicate';

const LOG_FIELDS = [
  'measured_at',
  'moisture_pct',
  'sun_hours',
  'shade_hours',
  'turn_count',
  'turn_frequency_hours',
  'weather',
  'notes',
];

// Por qué no se corrigió o no se eliminó una bitácora del servidor.
export function correctionErrorMessage(error: unknown) {
  if (!isApiError(error)) {
    return 'No fue posible corregir la bitácora. Revisa tu conexión e inténtalo nuevamente.';
  }
  switch (error.code) {
    case DRYING_ERROR.staleVersion:
      return 'Otra persona cambió esta bitácora. Vuelve a abrirla para ver sus datos actuales.';
    case DRYING_ERROR.notInProgress:
      return 'El secado de este lote ya se finalizó: sus bitácoras ya no se corrigen.';
    case 'not_found':
      return 'Esta bitácora ya no existe.';
    default:
      return getErrorMessage(error, 'No fue posible corregir la bitácora.');
  }
}

// El rechazo al corregir una bitácora en línea: lo que es de un campo va junto a él (la fecha
// repetida, un rango), y lo demás se devuelve para mostrarlo arriba del formulario.
export function correctionError(
  error: unknown,
  setError: UseFormSetError<LogFormInput>,
): string | undefined {
  if (isApiError(error) && error.code === DRYING_ERROR.duplicateLogDate) {
    setError('measured_at', { type: DUPLICATE_ERROR, message: error.message });
    return undefined;
  }
  if (applyApiFieldErrors(error, setError, LOG_FIELDS).applied) {
    return undefined;
  }
  return correctionErrorMessage(error);
}
