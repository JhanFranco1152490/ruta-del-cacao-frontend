import type { UseFormSetError } from 'react-hook-form';

import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import { FERMENTATION_ERROR } from './api';
import type { TurnFormInput } from './turn-form';

export const SAVE_TURN_FAILED =
  'No fue posible guardar el volteo en el dispositivo. Inténtalo nuevamente.';

// El error de la hora repetida: el campo ofrece ver la lista de volteos.
export const DUPLICATE_ERROR = 'duplicate';

const TURN_FIELDS = ['turned_at', 'temperature_c', 'ph', 'notes'];

// Por qué no se corrigió o no se eliminó un volteo del servidor.
export function correctionErrorMessage(error: unknown) {
  if (!isApiError(error)) {
    return 'No fue posible corregir el volteo. Revisa tu conexión e inténtalo nuevamente.';
  }
  switch (error.code) {
    case FERMENTATION_ERROR.staleVersion:
      return 'Otra persona cambió este volteo. Vuelve a abrirlo para ver sus datos actuales.';
    case FERMENTATION_ERROR.notInProgress:
      return 'La fermentación de este lote ya se finalizó: sus volteos ya no se corrigen.';
    case 'not_found':
      return 'Este volteo ya no existe.';
    default:
      return getErrorMessage(error, 'No fue posible corregir el volteo.');
  }
}

// El rechazo al corregir un volteo en línea: lo que es de un campo va junto a él (la hora repetida,
// un rango), y lo demás se devuelve para mostrarlo arriba del formulario.
export function correctionError(
  error: unknown,
  setError: UseFormSetError<TurnFormInput>,
): string | undefined {
  if (
    isApiError(error) &&
    error.code === FERMENTATION_ERROR.duplicateTurnTime
  ) {
    setError('turned_at', { type: DUPLICATE_ERROR, message: error.message });
    return undefined;
  }
  if (applyApiFieldErrors(error, setError, TURN_FIELDS).applied) {
    return undefined;
  }
  return correctionErrorMessage(error);
}
