import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { type LotStatus, lotStatusLabel } from '@/lib/lot-status';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';

import { FERMENTATION_ERROR } from './api';
import type { StartFormInput } from './start-form';

type StartField = keyof StartFormInput;

// Lo que hace el formulario con el rechazo de iniciar o corregir el inicio: pedir la confirmación
// de la capacidad, marcar un campo (y volver a leer los cajones si el elegido se ocupó) o decirlo
// arriba.
export type StartFailure =
  | { kind: 'capacity'; capacityKg?: string; greenWeightKg?: string }
  | { kind: 'field'; field: StartField; message: string; reload?: boolean }
  | { kind: 'form'; message: string };

const FIELDS: readonly StartField[] = [
  'facility_id',
  'started_at',
  'responsible_id',
];

export function startFailureOf(
  error: unknown,
  facilityName: string,
): StartFailure {
  if (!isApiError(error)) {
    return {
      kind: 'form',
      message:
        'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.',
    };
  }
  switch (error.code) {
    // Con las cifras del servidor: la capacidad pudo cambiar después de abrir el formulario.
    case FERMENTATION_ERROR.exceedsCapacity:
      return {
        kind: 'capacity',
        capacityKg: error.body.capacity_kg as string | undefined,
        greenWeightKg: error.body.green_weight_kg as string | undefined,
      };
    case FERMENTATION_ERROR.facilityUnavailable:
      return {
        kind: 'field',
        field: 'facility_id',
        message: `${facilityName} ya no está disponible. Elige otro.`,
        reload: true,
      };
    case FERMENTATION_ERROR.responsibleNotAvailable:
      return {
        kind: 'field',
        field: 'responsible_id',
        message: error.fields.responsible_id?.[0] ?? error.message,
      };
    case FERMENTATION_ERROR.lotInvalidStatus: {
      const current = error.body.current_status as LotStatus | undefined;
      return {
        kind: 'form',
        message: current
          ? `Este lote ya no está Generado (ahora: ${lotStatusLabel(current)}).`
          : error.message,
      };
    }
    case FERMENTATION_ERROR.hasTurns:
      return {
        kind: 'form',
        message:
          'Esta fermentación ya tiene volteos: su inicio ya no se corrige.',
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
    message: getErrorMessage(error, 'No fue posible guardar.'),
  };
}
