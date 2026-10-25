import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';

import { DRYING_ERROR } from './api';
import type { FinishFormInput } from './finish-form';

type FinishField = keyof FinishFormInput;

// El rechazo de finalizar: un dato que va en su campo (el fin antes de la última medición, un peso
// seco mayor que el peso en verde) o lo demás, arriba del formulario.
export type FinishFailure =
  | { kind: 'field'; field: FinishField; message: string }
  | { kind: 'form'; message: string };

const FIELDS: readonly FinishField[] = [
  'ended_at',
  'final_moisture_pct',
  'dry_weight_kg',
];

export function finishFailureOf(error: unknown): FinishFailure {
  if (!isApiError(error)) {
    return {
      kind: 'form',
      message:
        'No fue posible finalizar. Revisa tu conexión e inténtalo nuevamente.',
    };
  }
  switch (error.code) {
    case DRYING_ERROR.withoutLogs:
      return {
        kind: 'form',
        message: 'Registra al menos una bitácora para finalizar.',
      };
    case DRYING_ERROR.notInProgress:
      return {
        kind: 'form',
        message: 'El secado de este lote ya se finalizó.',
      };
    case DRYING_ERROR.staleVersion:
      return {
        kind: 'form',
        message:
          'Otra persona cambió este secado. Cierra y vuelve a abrirlo para ver sus datos actuales.',
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
