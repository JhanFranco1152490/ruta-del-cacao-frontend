import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import {
  formatShortDateTime,
  fromBogotaLocal,
  toBogotaLocal,
} from '@/lib/format/dates';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { durationText, hoursBetween, minuteOf } from '@/lib/format/hours';
import {
  FUTURE_MOMENT_MESSAGE,
  isLocalDateTime,
  NOTES_MAX_LENGTH,
  NOTES_TOO_LONG_MESSAGE,
} from '@/lib/validation/moment';

type Schemas = components['schemas'];

// El fin es lo que guarda un campo de fecha y hora (yyyy-MM-ddTHH:mm), en la hora de Bogotá.
export type FinishFormInput = { ended_at: string; notes: string };

// El fin cae entre el último volteo (puede ser el mismo minuto) y ahora, y siempre después del
// inicio, como lo exige el servidor. `now` se recibe para poder probarlo.
export function createFinishFormSchema({
  startedAt,
  lastTurnedAt,
  now = () => new Date(),
}: {
  startedAt: string;
  lastTurnedAt: string | null;
  now?: () => Date;
}) {
  return z.object({
    ended_at: z.string().superRefine((local, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!isLocalDateTime(local)) return issue(REQUIRED_FIELD_MESSAGE);
      const minute = minuteOf(fromBogotaLocal(local));
      if (lastTurnedAt && minute < minuteOf(lastTurnedAt)) {
        return issue(
          `No puede ser anterior al último volteo (${formatShortDateTime(lastTurnedAt)}).`,
        );
      }
      if (minute <= minuteOf(startedAt)) {
        return issue('Debe ser posterior al inicio de la fermentación.');
      }
      if (minute > minuteOf(now())) issue(FUTURE_MOMENT_MESSAGE);
    }),
    notes: z.string().trim().max(NOTES_MAX_LENGTH, NOTES_TOO_LONG_MESSAGE),
  });
}

export const finishFormOf = (now: Date): FinishFormInput => ({
  ended_at: toBogotaLocal(now.toISOString()),
  notes: '',
});

// «Duración: 5 días y 2 h (122 h)», con el fin que tiene el campo.
export function durationLine(startedAt: string, localEnd: string) {
  if (!isLocalDateTime(localEnd)) return null;
  const hours = hoursBetween(startedAt, fromBogotaLocal(localEnd));
  if (hours <= 0) return null;
  return `Duración: ${durationText(hours)} (${Math.round(hours)} h)`;
}

// Por qué no se puede finalizar todavía. Los volteos que esperan en la cola del teléfono cuentan:
// finalizar antes de que lleguen los dejaría rechazados.
export function finishBlockedReason({
  turnCount,
  queuedCount,
  online,
}: {
  turnCount: number;
  queuedCount: number;
  online: boolean;
}) {
  if (turnCount + queuedCount === 0) {
    return 'Registre al menos un volteo para finalizar';
  }
  if (queuedCount > 0) {
    return 'Hay volteos de este lote sin enviar. Espera a que se envíen.';
  }
  if (!online) return 'Finalizar la fermentación necesita conexión.';
  return null;
}

export const toFinishRequest = (
  values: FinishFormInput,
  expectedVersion: number,
): Schemas['FermentationFinishRequest'] => ({
  expected_version: expectedVersion,
  ended_at: fromBogotaLocal(values.ended_at),
  notes: values.notes,
});

export const finishedMessage = (durationHours: string) =>
  `Fermentación finalizada · ${durationText(durationHours)}`;
