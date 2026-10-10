import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { isIsoDate } from '@/lib/format/dates';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { ACTIVITY_TYPE_OPTIONS } from './activity-labels';
import type { ActivityType } from './activity-state';
import type { AgriculturalActivity } from './api';

type Schemas = components['schemas'];

export const PAST_DATE_MESSAGE = 'La fecha debe ser actual o futura';
export const OTHER_DESCRIPTION_MIN_LENGTH = 2;
export const OTHER_DESCRIPTION_MAX_LENGTH = 80;

// Lo que la persona tiene en el formulario. La finca solo sirve para elegir la parcela: no se
// envía.
export type ActivityFormInput = {
  farm_id: string;
  plot_id: string;
  activity_type: ActivityType | '';
  other_description: string;
  scheduled_date: string;
  assignee_id: string;
};

export const EMPTY_ACTIVITY_FORM: ActivityFormInput = {
  farm_id: '',
  plot_id: '',
  activity_type: '',
  other_description: '',
  scheduled_date: '',
  assignee_id: '',
};

const TYPES = ACTIVITY_TYPE_OPTIONS.map(({ value }) => value) as [
  ActivityType,
  ...ActivityType[],
];

const requiredText = () => z.string().trim().min(1, REQUIRED_FIELD_MESSAGE);

function descriptionError(description: string): string | null {
  if (!description) return REQUIRED_FIELD_MESSAGE;
  if (description.length < OTHER_DESCRIPTION_MIN_LENGTH) {
    return `Escribe al menos ${OTHER_DESCRIPTION_MIN_LENGTH} caracteres.`;
  }
  if (description.length > OTHER_DESCRIPTION_MAX_LENGTH) {
    return `Usa máximo ${OTHER_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }
  return null;
}

// `today` es la fecha de Bogotá. Al editar, `original` trae la fecha que tenía la actividad: una
// fecha que no cambia no se valida, para poder cambiar el responsable de una retrasada sin
// moverla; la que cambia debe ser hoy o futura. El servidor repite todas las validaciones.
export const createActivityFormSchema = ({
  today,
  original,
}: {
  today: string;
  original?: { scheduled_date: string };
}) =>
  z
    .object({
      farm_id: requiredText(),
      plot_id: requiredText(),
      // La lista llega vacía al abrir el formulario: vacío y un valor desconocido se señalan igual.
      activity_type: z
        .union([z.literal(''), z.enum(TYPES)], {
          error: REQUIRED_FIELD_MESSAGE,
        })
        .refine((value) => value !== '', REQUIRED_FIELD_MESSAGE)
        .transform((value) => value as ActivityType),
      other_description: z.string().trim(),
      scheduled_date: requiredText(),
      assignee_id: requiredText(),
    })
    .superRefine(
      ({ activity_type, other_description, scheduled_date }, context) => {
        const issue = (path: string, message: string) =>
          context.addIssue({ code: 'custom', path: [path], message });
        if (activity_type === 'other') {
          const error = descriptionError(other_description);
          if (error) issue('other_description', error);
        }
        if (!scheduled_date) return;
        if (!isIsoDate(scheduled_date)) {
          issue('scheduled_date', 'Escribe una fecha válida.');
        } else if (
          scheduled_date !== original?.scheduled_date &&
          scheduled_date < today
        ) {
          issue('scheduled_date', PAST_DATE_MESSAGE);
        }
      },
    )
    // La descripción es de las labores de tipo Otro: con cualquier otro tipo no existe.
    .transform((values) => ({
      ...values,
      other_description:
        values.activity_type === 'other' ? values.other_description : null,
    }));

export type ActivityFormValues = z.output<
  ReturnType<typeof createActivityFormSchema>
>;

export const toFormValues = (
  activity: AgriculturalActivity,
): ActivityFormInput => ({
  farm_id: activity.plot.farm.id,
  plot_id: activity.plot.id,
  activity_type: activity.activity_type,
  other_description: activity.other_description ?? '',
  scheduled_date: activity.scheduled_date,
  assignee_id: activity.assignee.id,
});

// `id` lo genera el dispositivo al abrir el formulario: reenviar el mismo formulario no programa
// la actividad dos veces.
export const toCreateRequest = (
  values: ActivityFormValues,
  id: string,
): Schemas['ActivityCreateRequest'] => ({
  id,
  plot_id: values.plot_id,
  activity_type: values.activity_type,
  // El servidor rechaza una descripción enviada con un tipo que no es Otro.
  ...(values.other_description !== null && {
    other_description: values.other_description,
  }),
  scheduled_date: values.scheduled_date,
  assignee_id: values.assignee_id,
});

// Solo lo que cambió, con la versión que se leyó; `null` si no cambió nada, porque el servidor
// exige al menos un campo. Al dejar de ser Otro, la descripción la borra el servidor.
export function toUpdateRequest(
  values: ActivityFormValues,
  activity: AgriculturalActivity,
): Schemas['PatchedActivityUpdateRequest'] | null {
  const changes: Omit<
    Schemas['PatchedActivityUpdateRequest'],
    'expected_version'
  > = {};
  if (values.activity_type !== activity.activity_type) {
    changes.activity_type = values.activity_type;
  }
  if (
    values.other_description !== null &&
    values.other_description !== activity.other_description
  ) {
    changes.other_description = values.other_description;
  }
  if (values.scheduled_date !== activity.scheduled_date) {
    changes.scheduled_date = values.scheduled_date;
  }
  if (values.assignee_id !== activity.assignee.id) {
    changes.assignee_id = values.assignee_id;
  }
  if (Object.keys(changes).length === 0) return null;
  return { ...changes, expected_version: activity.version };
}
