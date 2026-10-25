import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { type LotStatus, lotStatusLabel } from '@/lib/lot-status';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';

import { DRYING_ERROR } from './api';
import type { StartFormInput } from './start-form';

type StartField = keyof StartFormInput;

// Lo que hace el formulario con el rechazo de iniciar o corregir el inicio: pedir la confirmación
// de la humedad de entrada, marcar un campo (y volver a leer las marquesinas si la elegida se
// ocupó) o decirlo arriba.
export type StartFailure =
  | { kind: 'moisture'; min?: string; max?: string }
  | { kind: 'field'; field: StartField; message: string; reload?: boolean }
  | { kind: 'form'; message: string };

const FIELDS: readonly StartField[] = [
  'facility_id',
  'started_at',
  'entry_moisture_pct',
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
    // Con el rango del servidor: pudo cambiar después de abrir el formulario.
    case DRYING_ERROR.entryMoistureOutOfRange: {
      const range = error.body.range as
        { min?: string; max?: string } | undefined;
      return { kind: 'moisture', min: range?.min, max: range?.max };
    }
    case DRYING_ERROR.facilityUnavailable:
      return {
        kind: 'field',
        field: 'facility_id',
        message: `${facilityName} ya no está disponible. Elige otra.`,
        reload: true,
      };
    case DRYING_ERROR.responsibleNotAvailable:
      return {
        kind: 'field',
        field: 'responsible_id',
        message: error.fields.responsible_id?.[0] ?? error.message,
      };
    case DRYING_ERROR.lotInvalidStatus: {
      const current = error.body.current_status as LotStatus | undefined;
      return {
        kind: 'form',
        message: current
          ? `Este lote ya no está Fermentado (ahora: ${lotStatusLabel(current)}).`
          : error.message,
      };
    }
    case DRYING_ERROR.hasLogs:
      return {
        kind: 'form',
        message: 'Este secado ya tiene bitácoras: su inicio ya no se corrige.',
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
    message: getErrorMessage(error, 'No fue posible guardar.'),
  };
}
