import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { doneDateIssue } from '@/lib/activity-dates';
import { dateInBogota, formatLongDate } from '@/lib/format/dates';
import {
  normalizeQuantity,
  type QuantityInput,
  type UsedInputRow,
  usedInputIssues,
  usedInputPhrase,
} from '@/lib/input-usage';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { activityTitle } from './activity-labels';
import type { AgriculturalActivity } from './api';

type Schemas = components['schemas'];

export type CompletionFormInput = {
  done_date: string;
  inputs: UsedInputRow[];
};

// Una realización no se corrige después, así que se valida antes de guardar todo lo que el
// servidor va a comprobar. `today` es la fecha de Bogotá. La fecha puede ser anterior a la
// programada (la labor se adelantó), pero no al día en que la actividad se programó.
export const createCompletionSchema = ({
  today,
  activity,
}: {
  today: string;
  activity: Pick<AgriculturalActivity, 'activity_type' | 'created_at'>;
}) =>
  z
    .object({
      done_date: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
      inputs: z.array(
        z.object({
          input_id: z.string(),
          quantity: z.string().transform(normalizeQuantity),
        }),
      ),
    })
    .superRefine(({ done_date, inputs }, context) => {
      const issue = (path: (string | number)[], message: string) =>
        context.addIssue({ code: 'custom', path, message });

      if (done_date) {
        const error = doneDateIssue(done_date, today, {
          date: dateInBogota(activity.created_at),
          reason: 'la programación de la actividad',
        });
        if (error) issue(['done_date'], error);
      }

      // El inventario es el recordatorio de contar la bodega: el conteo se registra en Insumos, y
      // descontar aquí lo contaría dos veces.
      if (activity.activity_type === 'inventory' && inputs.length > 0) {
        issue(['inputs'], 'Una actividad de inventario no lleva insumos');
        return;
      }
      for (const { index, field, message } of usedInputIssues(inputs)) {
        issue(['inputs', index, field], message);
      }
    });

export type CompletionFormValues = z.output<
  ReturnType<typeof createCompletionSchema>
>;

// El cuerpo de la realización. `capturedAt` es la hora del dispositivo al guardar: puede ser
// horas antes de que llegue al servidor.
export const toCompletionRequest = (
  values: CompletionFormValues,
  capturedAt: string,
): Schemas['CompletionRequest'] => ({
  done_date: values.done_date,
  inputs: values.inputs,
  captured_at: capturedAt,
});

const joinList = (items: string[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;

// Lo que se va a registrar, dicho antes de confirmar: después no se puede modificar.
export function completionSummary(
  activity: Pick<
    AgriculturalActivity,
    'activity_type' | 'other_description' | 'plot'
  >,
  doneDate: string,
  inputs: readonly { input: QuantityInput; quantity: string }[],
) {
  const used =
    inputs.length === 0
      ? 'sin insumos'
      : `con ${joinList(
          inputs.map(({ input, quantity }) => usedInputPhrase(quantity, input)),
        )}, que se descuentan del inventario de la finca`;
  return `Vas a registrar la labor ${activityTitle(activity)} de ${activity.plot.code} como realizada el ${formatLongDate(doneDate)}, ${used}. Después no se podrá modificar.`;
}
