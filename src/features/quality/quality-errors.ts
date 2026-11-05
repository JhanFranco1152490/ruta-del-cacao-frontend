import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { isLotStatus, lotStatusLabel } from '@/lib/lot-status';
import { VALIDATION_ERROR_CODE } from '@/lib/offline/adapters';
import type { QualityAction } from '@/lib/paths/quality';

import { type LotQuality, QUALITY_ERROR } from './api';
import { SUM_EXCEEDS_MESSAGE } from './evaluation-sum';

// El rechazo de un formulario de calidad:
// - `field`: un dato que va en su campo;
// - `status`: el lote ya cambió de estado (otra persona lo evaluó, clasificó o descartó); se cierra
//   el diálogo, se avisa y la lista se refresca;
// - `stale`: otra persona corrigió antes; el formulario carga los valores vigentes de `current`;
// - `form`: lo demás, arriba del formulario.
export type QualityFailure =
  | { kind: 'field'; field: string; message: string }
  | { kind: 'status'; message: string }
  | { kind: 'stale'; message: string; current: LotQuality | null }
  | { kind: 'form'; message: string };

const FIELDS: Record<QualityAction, readonly string[]> = {
  evaluar: ['well_fermented_pct', 'moldy_pct', 'other_defects_pct', 'notes'],
  corregir: ['well_fermented_pct', 'moldy_pct', 'other_defects_pct', 'notes'],
  clasificar: [
    'g1_kg',
    'g2_kg',
    'discard_kg',
    'discard_reason',
    'discard_detail',
  ],
  descartar: ['reason', 'detail'],
};

const NETWORK_MESSAGE =
  'No fue posible guardar. Revisa tu conexión e inténtalo nuevamente.';

export const STALE_MESSAGE =
  'Otra persona corrigió esta evaluación. Se cargaron sus valores actuales; revísalos antes de guardar.';

// «El lote ya está evaluado.»; al corregir, «El lote ya fue clasificado y no se puede corregir.».
function statusMessage(action: QualityAction, currentStatus: unknown) {
  if (!isLotStatus(currentStatus)) return 'El lote cambió de estado.';
  const label = lotStatusLabel(currentStatus).toLowerCase();
  if (
    action === 'corregir' &&
    (currentStatus === 'classified' || currentStatus === 'discarded')
  ) {
    return `El lote ya fue ${label} y no se puede corregir.`;
  }
  return `El lote ya está ${label}.`;
}

// Lo que falta o sobra según el servidor, que pudo tener otro peso seco que el de la pantalla.
function mismatchMessage(difference: unknown, fallback: string | undefined) {
  const value = Number(difference);
  if (typeof difference !== 'string' || Number.isNaN(value) || value === 0) {
    return fallback ?? 'La clasificación debe sumar el peso seco del lote.';
  }
  const kilos = formatFixedDecimal(Math.abs(value), 1);
  return value > 0 ? `Faltan ${kilos} kg por distribuir` : `Sobran ${kilos} kg`;
}

export function qualityFailureOf(
  error: unknown,
  action: QualityAction,
): QualityFailure {
  if (!isApiError(error)) return { kind: 'form', message: NETWORK_MESSAGE };
  const formMessage = error.fields.non_field_errors?.[0];
  switch (error.code) {
    case QUALITY_ERROR.lotInvalidStatus:
      return {
        kind: 'status',
        message: statusMessage(action, error.body.current_status),
      };
    case QUALITY_ERROR.staleVersion:
      return {
        kind: 'stale',
        message: STALE_MESSAGE,
        current: (error.body.current as LotQuality | undefined) ?? null,
      };
    case QUALITY_ERROR.sumExceeds100:
      return {
        kind: 'field',
        field: 'other_defects_pct',
        message: SUM_EXCEEDS_MESSAGE,
      };
    case QUALITY_ERROR.classificationSumMismatch:
      return {
        kind: 'form',
        message: mismatchMessage(error.body.difference_kg, formMessage),
      };
  }
  if (error.code === VALIDATION_ERROR_CODE) {
    const field = FIELDS[action].find((name) => error.fields[name]?.[0]);
    if (field) {
      return { kind: 'field', field, message: error.fields[field]![0] };
    }
  }
  return {
    kind: 'form',
    message: getErrorMessage(error, 'No fue posible guardar.'),
  };
}
