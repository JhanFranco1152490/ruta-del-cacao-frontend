import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import {
  formatShortDateTime,
  fromBogotaLocal,
  toBogotaLocal,
} from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { minuteOf } from '@/lib/format/hours';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import {
  FUTURE_MOMENT_MESSAGE,
  isLocalDateTime,
} from '@/lib/validation/moment';

import { ONE_DECIMAL_MESSAGE, percentField } from './log-form';
import { computeYield, yieldText } from './yield';

type Schemas = components['schemas'];

// El fin es lo que guarda un campo de fecha y hora (yyyy-MM-ddTHH:mm), en la hora de Bogotá.
export type FinishFormInput = {
  ended_at: string;
  final_moisture_pct: string;
  dry_weight_kg: string;
};

export const POSITIVE_WEIGHT_MESSAGE = 'Debe ser mayor que cero.';

export const heavierThanGreenMessage = (greenWeightKg: string) =>
  `No puede ser mayor que el peso en verde (${formatDecimal(greenWeightKg, 1)} kg).`;

// El fin puede ser en cualquier momento, también antes de completar un día, siempre después de la
// última medición y no futuro. El peso seco es mayor que cero y no pasa del peso en verde.
// `now` se recibe para poder probarlo.
export function createFinishFormSchema({
  lastMeasuredAt,
  greenWeightKg,
  now = () => new Date(),
}: {
  lastMeasuredAt: string | null;
  greenWeightKg: string;
  now?: () => Date;
}) {
  return z.object({
    ended_at: z.string().superRefine((local, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!isLocalDateTime(local)) return issue(REQUIRED_FIELD_MESSAGE);
      const minute = minuteOf(fromBogotaLocal(local));
      if (lastMeasuredAt && minute < minuteOf(lastMeasuredAt)) {
        return issue(
          `No puede ser anterior a la última medición (${formatShortDateTime(lastMeasuredAt)}).`,
        );
      }
      if (minute > minuteOf(now())) issue(FUTURE_MOMENT_MESSAGE);
    }),
    final_moisture_pct: percentField,
    dry_weight_kg: decimalText().superRefine((text, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!text) return issue(REQUIRED_FIELD_MESSAGE);
      if (!isDecimal(text) || Number(text) <= 0) {
        return issue(POSITIVE_WEIGHT_MESSAGE);
      }
      if (Number(text) > Number(greenWeightKg)) {
        return issue(heavierThanGreenMessage(greenWeightKg));
      }
      if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
    }),
  });
}

export const finishFormOf = (now: Date): FinishFormInput => ({
  ended_at: toBogotaLocal(now.toISOString()),
  final_moisture_pct: '',
  dry_weight_kg: '',
});

// «Rendimiento: 38,2 %» mientras se escribe el peso seco; nada si todavía no hay un peso válido.
export function yieldLine(dryWeight: string, greenWeightKg: string) {
  const text = dryWeight.replace(',', '.');
  if (!isDecimal(text) || Number(text) <= 0) return null;
  if (Number(text) > Number(greenWeightKg)) return null;
  const percent = computeYield(text, greenWeightKg);
  return percent === null ? null : `Rendimiento: ${yieldText(percent)}`;
}

// Por qué no se puede finalizar todavía. Las bitácoras que esperan en la cola del teléfono cuentan:
// finalizar antes de que lleguen dejaría el secado sin su último dato.
export function finishBlockedReason({
  logCount,
  queuedCount,
  online,
}: {
  logCount: number;
  queuedCount: number;
  online: boolean;
}) {
  if (logCount + queuedCount === 0) {
    return 'Registra al menos una bitácora para finalizar.';
  }
  if (queuedCount > 0) {
    return 'Hay bitácoras de este lote sin enviar. Espera a que se envíen.';
  }
  if (!online) return 'Finalizar el secado necesita conexión.';
  return null;
}

export const toFinishRequest = (
  values: FinishFormInput,
  expectedVersion: number,
): Schemas['DryingFinishRequest'] => ({
  expected_version: expectedVersion,
  ended_at: fromBogotaLocal(values.ended_at),
  final_moisture_pct: values.final_moisture_pct,
  dry_weight_kg: values.dry_weight_kg,
});

export const finishedMessage = (yieldPct: string) =>
  `Rendimiento calculado: ${yieldText(yieldPct)}`;
