import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';

import { FERMENTATION_ERROR } from './api';
import type { FinishFormInput } from './finish-form';

type FinishField = keyof FinishFormInput;

// El rechazo de finalizar: un dato que va en su campo (el fin antes del último volteo, con la hora
// que da el servidor) o lo demás, arriba del formulario.
export type FinishFailure =
  | { kind: 'field'; field: FinishField; message: string }
  | { kind: 'form'; message: string };

const FIELDS: readonly FinishField[] = ['ended_at', 'notes'];

export function finishFailureOf(error: unknown): FinishFailure {
  if (!isApiError(error)) {
    return {
      kind: 'form',
      message:
        'No fue posible finalizar. Revisa tu conexión e inténtalo nuevamente.',
    };
  }
  switch (error.code) {
    case FERMENTATION_ERROR.withoutTurns:
      return {
        kind: 'form',
        message: 'Registre al menos un volteo para finalizar',
      };
    case FERMENTATION_ERROR.notInProgress:
      return {
        kind: 'form',
        message: 'La fermentación de este lote ya se finalizó.',
      };
    case FERMENTATION_ERROR.staleVersion:
      return {
        kind: 'form',
        message:
          'Otra persona cambió esta fermentación. Cierra y vuelve a abrirla para ver sus datos actuales.',
      };
  }
  if (error.code === VALIDATION_ERROR_CODE) {
    const field = FIELDS.find((name) => error.fields[name]?.[0]);
    if (field) {
      return { kind: 'field', field, message: error.fields[field]![0] };
    }
  }
  return {
    kind: 'form',
    message: getErrorMessage(error, 'No fue posible finalizar.'),
  };
}
