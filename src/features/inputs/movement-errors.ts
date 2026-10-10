import { getErrorMessage, isApiError } from '@/lib/api/errors';

import { INPUT_ERROR } from './api';

export type MovementField = 'occurred_on' | 'amount' | 'note' | 'farm';

export type MovementError = {
  // Los errores que van junto a un campo del formulario.
  fields: Partial<Record<MovementField, string>>;
  // El que no corresponde a ningún campo, en el aviso general.
  general?: string;
};

// El servidor nombra los campos como la API; el formulario escribe la cantidad en empaques o en la
// unidad, en un solo campo.
const FIELD_OF: Record<string, MovementField> = {
  occurred_on: 'occurred_on',
  quantity: 'amount',
  counted_quantity: 'amount',
  note: 'note',
  farm_id: 'farm',
};

const SAVE_FAILED =
  'No fue posible registrar el movimiento. Revisa tu conexión e inténtalo nuevamente.';

export function movementErrorOf(error: unknown): MovementError {
  if (!isApiError(error)) {
    return { fields: {}, general: getErrorMessage(error, SAVE_FAILED) };
  }
  switch (error.code) {
    case INPUT_ERROR.inputInactive:
      return {
        fields: {},
        general:
          'Este insumo está inactivo y no recibe entradas. Actívalo para registrarlas.',
      };
    case INPUT_ERROR.farmInactive:
      return {
        fields: {
          farm: 'La finca está inactiva: no recibe entradas ni conteos.',
        },
      };
    case INPUT_ERROR.movementIdConflict:
      return {
        fields: {},
        general:
          'Este registro ya se envió con otros datos. Cierra el formulario y vuelve a abrirlo.',
      };
  }
  if (error.status === 404) {
    return {
      fields: {},
      general: 'El insumo o la finca ya no existen. Cierra y revisa la lista.',
    };
  }
  const fields: MovementError['fields'] = {};
  const unmatched: string[] = [];
  for (const [name, messages] of Object.entries(error.fields)) {
    const field = FIELD_OF[name];
    if (field && messages[0]) fields[field] = messages[0];
    else unmatched.push(...messages);
  }
  const general =
    unmatched[0] ??
    (Object.keys(fields).length
      ? undefined
      : getErrorMessage(error, SAVE_FAILED));
  return { fields, general };
}
