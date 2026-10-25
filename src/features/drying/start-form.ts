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

import type { Drying, StartOptions } from './api';
import { MAX_PERCENT, ONE_DECIMAL_MESSAGE, PERCENT_MESSAGE } from './log-form';

type Schemas = components['schemas'];
type Dryer = Schemas['DryingDryer'];

// El inicio es la hora de un campo de fecha y hora (yyyy-MM-ddTHH:mm), en la hora de Bogotá; la
// humedad de entrada va como la escribe quien registra.
export type StartFormInput = {
  facility_id: string;
  started_at: string;
  entry_moisture_pct: string;
  responsible_id: string;
};

// El secado no empieza antes de que termine la fermentación del lote: el inicio cae entre ese
// momento y ahora. `now` se recibe para poder probarlo.
export function createStartFormSchema({
  earliestStartAt,
  now = () => new Date(),
}: {
  earliestStartAt: string;
  now?: () => Date;
}) {
  const required = z.string().min(1, REQUIRED_FIELD_MESSAGE);
  return z.object({
    facility_id: required,
    started_at: z.string().superRefine((local, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!isLocalDateTime(local)) return issue(REQUIRED_FIELD_MESSAGE);
      const minute = minuteOf(fromBogotaLocal(local));
      if (minute < minuteOf(earliestStartAt)) {
        return issue(
          `No puede ser anterior al fin de la fermentación (${formatShortDateTime(earliestStartAt)}).`,
        );
      }
      if (minute > minuteOf(now())) issue(FUTURE_MOMENT_MESSAGE);
    }),
    entry_moisture_pct: decimalText().superRefine((text, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', message });
      if (!text) return issue(REQUIRED_FIELD_MESSAGE);
      if (!isDecimal(text) || Number(text) < 0 || Number(text) > MAX_PERCENT) {
        return issue(PERCENT_MESSAGE);
      }
      if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
    }),
    responsible_id: required,
  });
}

// Con qué abre el formulario. Al iniciar: ahora, la marquesina si hay una sola y, como responsable,
// quien registra si puede serlo. Al corregir: lo que el secado tiene.
export function startFormOf({
  options,
  userId,
  now,
  drying,
}: {
  options: StartOptions;
  userId: string | undefined;
  now: Date;
  drying?: Drying;
}): StartFormInput {
  if (drying) {
    return {
      facility_id: drying.facility.id,
      started_at: toBogotaLocal(drying.started_at),
      entry_moisture_pct: drying.entry_moisture_pct.replace('.', ','),
      responsible_id: drying.responsible.id,
    };
  }
  const own = options.responsibles.find(
    ({ id, assignable }) => id === userId && assignable,
  );
  return {
    facility_id:
      options.facilities.length === 1 ? options.facilities[0].id : '',
    started_at: toBogotaLocal(now.toISOString()),
    entry_moisture_pct: '',
    responsible_id: own?.id ?? '',
  };
}

// «M-01 · 600 kg en baba».
export const facilityOptionLabel = (dryer: Dryer) =>
  `${dryer.name} · ${formatDecimal(dryer.capacity_kg, 1)} kg en baba`;

export const toStartRequest = (
  values: StartFormInput,
  lotId: string,
  confirmEntryMoisture: boolean,
): Schemas['DryingStartRequest'] => ({
  lot_id: lotId,
  facility_id: values.facility_id,
  started_at: fromBogotaLocal(values.started_at),
  entry_moisture_pct: values.entry_moisture_pct,
  responsible_id: values.responsible_id,
  confirm_entry_moisture: confirmEntryMoisture,
});

// Al corregir el inicio se envía solo lo que cambió.
export function startChanges(
  values: StartFormInput,
  drying: Drying,
): Omit<
  Schemas['PatchedDryingStartUpdateRequest'],
  'expected_version' | 'confirm_entry_moisture'
> {
  const startedAt = fromBogotaLocal(values.started_at);
  return {
    ...(values.facility_id !== drying.facility.id && {
      facility_id: values.facility_id,
    }),
    ...(minuteOf(startedAt) !== minuteOf(drying.started_at) && {
      started_at: startedAt,
    }),
    ...(Number(values.entry_moisture_pct) !==
      Number(drying.entry_moisture_pct) && {
      entry_moisture_pct: values.entry_moisture_pct,
    }),
    ...(values.responsible_id !== drying.responsible.id && {
      responsible_id: values.responsible_id,
    }),
  };
}
