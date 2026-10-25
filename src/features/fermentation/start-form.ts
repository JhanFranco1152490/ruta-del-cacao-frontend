import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import {
  formatShortDayMonth,
  fromBogotaLocal,
  toBogotaLocal,
} from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import type { Fermentation } from './api';
import { exceedsCapacity } from './capacity';
import { minuteOf } from '@/lib/format/hours';
import {
  FUTURE_MOMENT_MESSAGE,
  isLocalDateTime,
} from '@/lib/validation/moment';

type Schemas = components['schemas'];
export type StartOptions = Schemas['StartOptions'];
type Box = Schemas['FermentationBox'];

// La hora de inicio es la de un campo de fecha y hora (yyyy-MM-ddTHH:mm), en la hora de Bogotá.
export type StartFormInput = {
  facility_id: string;
  started_at: string;
  responsible_id: string;
};

const kilos = (value: string) => `${formatDecimal(value, 1)} kg`;

// No se fermenta cacao que no se ha recolectado: el inicio cae entre el día de la cosecha y ahora.
// `now` se recibe para poder probarlo.
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
          `No puede ser anterior a la cosecha (${formatShortDayMonth(earliestStartAt)}.).`,
        );
      }
      if (minute > minuteOf(now())) issue(FUTURE_MOMENT_MESSAGE);
    }),
    responsible_id: required,
  });
}

// Con qué abre el formulario. Al iniciar: ahora, el cajón si hay uno solo y, como responsable,
// quien registra si puede serlo. Al corregir: lo que la fermentación tiene.
export function startFormOf({
  options,
  userId,
  now,
  fermentation,
}: {
  options: StartOptions;
  userId: string | undefined;
  now: Date;
  fermentation?: Fermentation;
}): StartFormInput {
  if (fermentation) {
    return {
      facility_id: fermentation.facility.id,
      started_at: toBogotaLocal(fermentation.started_at),
      responsible_id: fermentation.responsible.id,
    };
  }
  const own = options.responsibles.find(
    ({ id, assignable }) => id === userId && assignable,
  );
  return {
    facility_id:
      options.facilities.length === 1 ? options.facilities[0].id : '',
    started_at: toBogotaLocal(now.toISOString()),
    responsible_id: own?.id ?? '',
  };
}

// «C-01 · 600 kg en baba», y si el lote pesa más, «· No alcanza para este lote».
export const facilityOptionLabel = (box: Box, greenWeightKg: string) =>
  [
    box.name,
    `${kilos(box.capacity_kg)} en baba`,
    ...(exceedsCapacity(greenWeightKg, box.capacity_kg)
      ? ['No alcanza para este lote']
      : []),
  ].join(' · ');

export const capacityWarning = (
  greenWeightKg: string,
  box: Pick<Box, 'name' | 'capacity_kg'>,
) =>
  `El lote (${kilos(greenWeightKg)}) supera la capacidad de ${box.name} (${kilos(box.capacity_kg)}). ¿Iniciar de todos modos?`;

export const toStartRequest = (
  values: StartFormInput,
  lotId: string,
  confirmOverCapacity: boolean,
): Schemas['FermentationStartRequest'] => ({
  lot_id: lotId,
  facility_id: values.facility_id,
  started_at: fromBogotaLocal(values.started_at),
  responsible_id: values.responsible_id,
  confirm_over_capacity: confirmOverCapacity,
});

// Al corregir el inicio se envía solo lo que cambió.
export function startChanges(
  values: StartFormInput,
  fermentation: Fermentation,
): Omit<
  Schemas['PatchedFermentationStartUpdateRequest'],
  'expected_version' | 'confirm_over_capacity'
> {
  const startedAt = fromBogotaLocal(values.started_at);
  return {
    ...(values.facility_id !== fermentation.facility.id && {
      facility_id: values.facility_id,
    }),
    ...(minuteOf(startedAt) !== minuteOf(fermentation.started_at) && {
      started_at: startedAt,
    }),
    ...(values.responsible_id !== fermentation.responsible.id && {
      responsible_id: values.responsible_id,
    }),
  };
}
