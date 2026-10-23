import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { fromBogotaLocal } from '@/lib/format/dates';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { minuteOf } from './fermentation-time';

type Schemas = components['schemas'];

// Los mismos topes y decimales que guarda el servidor. Una masa en fermentación anda entre 25 y
// 50 °C: los 80 °C no los alcanza ningún cajón y atrapan un error de digitación (450 por 45,0). El
// pH lleva dos decimales porque así lo muestran los medidores.
export const MAX_TEMPERATURE_C = 80;
export const TEMPERATURE_DECIMALS = 1;
export const MAX_PH = 14;
export const PH_DECIMALS = 2;
export const NOTES_MAX_LENGTH = 500;

export const TEMPERATURE_MESSAGE =
  'La temperatura debe ser mayor que 0 °C y hasta 80 °C.';
export const PH_MESSAGE = 'pH válido entre 0 y 14';
export const FUTURE_MOMENT_MESSAGE = 'No puede ser una fecha futura.';
export const BEFORE_START_MESSAGE =
  'No puede ser anterior al inicio de la fermentación.';
export const NOTES_TOO_LONG_MESSAGE = `Máximo ${NOTES_MAX_LENGTH} caracteres.`;

// La hora del volteo es la de un campo de fecha y hora (yyyy-MM-ddTHH:mm), en la hora de Bogotá.
export type TurnFormInput = {
  turned_at: string;
  temperature_c: string;
  ph: string;
  notes: string;
};

// Los decimales con punto («45.5»), como los espera la API.
export type TurnFormValues = TurnFormInput;

// Lo que entrega un campo de fecha y hora completo; vacío o a medias no es una hora.
export const isLocalDateTime = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

const temperatureField = decimalText().superRefine((text, context) => {
  const issue = (message: string) =>
    context.addIssue({ code: 'custom', message });
  if (!text) return issue(REQUIRED_FIELD_MESSAGE);
  const degrees = Number(text);
  if (!isDecimal(text) || degrees <= 0 || degrees > MAX_TEMPERATURE_C) {
    return issue(TEMPERATURE_MESSAGE);
  }
  if (!decimalPattern(TEMPERATURE_DECIMALS).test(text)) {
    issue('Usa máximo 1 decimal.');
  }
});

const phField = decimalText().superRefine((text, context) => {
  const issue = (message: string) =>
    context.addIssue({ code: 'custom', message });
  if (!text) return issue(REQUIRED_FIELD_MESSAGE);
  const ph = Number(text);
  if (!isDecimal(text) || ph < 0 || ph > MAX_PH) return issue(PH_MESSAGE);
  if (!decimalPattern(PH_DECIMALS).test(text)) {
    issue('Usa máximo 2 decimales.');
  }
});

// El volteo cae entre el minuto del inicio y ahora. `now` se recibe para poder probarlo.
export function createTurnFormSchema({
  startedAt,
  now = () => new Date(),
}: {
  startedAt: string;
  now?: () => Date;
}) {
  return z.object({
    turned_at: z.string().superRefine((local, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!isLocalDateTime(local)) return issue(REQUIRED_FIELD_MESSAGE);
      const minute = minuteOf(fromBogotaLocal(local));
      if (minute < minuteOf(startedAt)) {
        return issue(BEFORE_START_MESSAGE);
      }
      if (minute > minuteOf(now())) issue(FUTURE_MOMENT_MESSAGE);
    }),
    temperature_c: temperatureField,
    ph: phField,
    notes: z.string().trim().max(NOTES_MAX_LENGTH, NOTES_TOO_LONG_MESSAGE),
  });
}

// El id lo genera el dispositivo, para que un reenvío desde la cola no registre el volteo dos
// veces. `capturedAt` es la hora del dispositivo al guardar.
export const toTurnCreateRequest = (
  values: TurnFormValues,
  { id, capturedAt }: { id: string; capturedAt: string },
): Schemas['FermentationTurnCreateRequest'] => ({
  id,
  turned_at: fromBogotaLocal(values.turned_at),
  temperature_c: values.temperature_c,
  ph: values.ph,
  notes: values.notes,
  captured_at: capturedAt,
});
