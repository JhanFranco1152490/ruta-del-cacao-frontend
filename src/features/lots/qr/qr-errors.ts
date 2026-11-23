import { getErrorMessage, isApiError } from '@/lib/api/errors';

import { LOT_ERROR } from '../api';

const GENERATE_FAILED =
  'No fue posible generar el código QR. Revisa tu conexión e inténtalo nuevamente.';

// Otra persona lo generó antes: no es un fallo, la ficha se vuelve a leer y muestra el que existe.
export const isQrAlreadyGenerated = (error: unknown) =>
  isApiError(error) && error.code === LOT_ERROR.qrAlreadyExists;

export function generateQrErrorMessage(error: unknown) {
  if (!isApiError(error)) return GENERATE_FAILED;
  if (error.status === 404) return 'Este lote ya no existe.';
  if (error.code === LOT_ERROR.notClassified) {
    return 'El lote cambió de estado: ya no puede tener código QR.';
  }
  return getErrorMessage(error, GENERATE_FAILED);
}
