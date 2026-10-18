import { z } from 'zod';

import { doneDateIssue } from '@/lib/activity-dates';
import type { components } from '@/lib/api/schema';
import { normalizeQuantity, type UsedInputRow } from '@/lib/input-usage';

import { controlWorkIssues, scheduleIssues } from './control-rules';
import { CONTROL_METHOD_OPTIONS, type ControlMethod } from './monitoring-rules';

export type DetectionControlRequest =
  components['schemas']['DetectionControlRequest'];

// Un control que se decide después del recorrido, desde una detección ya registrada: programado
// para una fecha o registrado como ya hecho. Los dos dicen quién lo hace o lo hizo.
export type ControlFormInput = {
  // Lo genera el dispositivo al abrir el formulario: un reintento no duplica el control.
  id: string;
  mode: 'scheduled' | 'done';
  done_date: string;
  scheduled_date: string;
  assignee_id: string;
  method: '' | ControlMethod;
  method_description: string;
  inputs: UsedInputRow[];
  planned_input_id: string;
};

export const emptyControlForm = (
  id: string,
  mode: ControlFormInput['mode'],
  today: string,
): ControlFormInput => ({
  id,
  mode,
  done_date: mode === 'done' ? today : '',
  scheduled_date: '',
  assignee_id: '',
  method: '',
  method_description: '',
  inputs: [],
  planned_input_id: '',
});

const methodValues = CONTROL_METHOD_OPTIONS.map(({ value }) => value);

// `today` es la fecha de Bogotá; `monitoringDate`, el día en que se hizo el monitoreo: un control
// hecho no puede ser anterior a lo que atiende.
export const createControlSchema = ({
  today,
  monitoringDate,
}: {
  today: string;
  monitoringDate: string;
}) =>
  z
    .object({
      id: z.string(),
      mode: z.enum(['scheduled', 'done']),
      done_date: z.string().trim(),
      scheduled_date: z.string().trim(),
      assignee_id: z.string(),
      method: z.enum(['', ...methodValues] as ['', ...ControlMethod[]]),
      method_description: z.string().trim(),
      inputs: z.array(
        z.object({
          input_id: z.string(),
          quantity: z.string().transform(normalizeQuantity),
        }),
      ),
      planned_input_id: z.string(),
    })
    .superRefine((values, context) => {
      const issues = [...controlWorkIssues(values)];
      if (values.mode === 'scheduled') {
        issues.push(...scheduleIssues(values, today));
      } else {
        const error = doneDateIssue(values.done_date, today, {
          date: monitoringDate,
          reason: 'la fecha del monitoreo',
        });
        if (error) issues.push({ path: ['done_date'], message: error });
        if (!values.assignee_id) {
          issues.push({
            path: ['assignee_id'],
            message: 'Elige el responsable',
          });
        }
      }
      for (const { path, message } of issues) {
        context.addIssue({ code: 'custom', path, message });
      }
    });

export type ControlFormValues = z.output<
  ReturnType<typeof createControlSchema>
>;

// El cuerpo del control. `capturedAt` es la hora del dispositivo al guardar uno hecho.
export function toDetectionControlRequest(
  values: ControlFormValues,
  capturedAt: string,
): DetectionControlRequest {
  const description =
    values.method === 'other' ? values.method_description : null;
  if (values.mode === 'done') {
    return {
      id: values.id,
      mode: 'done',
      done_date: values.done_date,
      assignee_id: values.assignee_id,
      method: values.method || null,
      method_description: description,
      inputs: values.inputs,
      captured_at: capturedAt,
    };
  }
  return {
    id: values.id,
    mode: 'scheduled',
    scheduled_date: values.scheduled_date,
    assignee_id: values.assignee_id,
    method: values.method || null,
    method_description: description,
    planned_input_id: values.planned_input_id || null,
  };
}
