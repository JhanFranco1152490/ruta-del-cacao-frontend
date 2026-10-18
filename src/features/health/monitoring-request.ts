import type { components } from '@/lib/api/schema';

import { OTHER_PEST_DISEASE } from './monitoring-rules';
import type { ControlValues, MonitoringFormValues } from './monitoring-schema';

export type MonitoringResultRequest =
  components['schemas']['MonitoringResultRequest'];

function controlRequest(control: ControlValues) {
  const description =
    control.method === 'other' ? control.method_description : null;
  if (control.mode === 'done') {
    return {
      id: control.id,
      mode: 'done' as const,
      method: control.method || null,
      method_description: description,
      inputs: control.inputs,
    };
  }
  if (control.mode === 'scheduled') {
    return {
      id: control.id,
      mode: 'scheduled' as const,
      scheduled_date: control.scheduled_date,
      assignee_id: control.assignee_id,
      method: control.method || null,
      method_description: description,
      planned_input_id: control.planned_input_id || null,
    };
  }
  return null;
}

// El cuerpo del resultado. `capturedAt` es la hora del dispositivo al guardar: puede ser horas
// antes de que llegue al servidor. El esquema ya validó los números.
export const toMonitoringRequest = (
  values: MonitoringFormValues,
  capturedAt: string,
): MonitoringResultRequest => ({
  done_date: values.done_date,
  sampling_unit: values.sampling_unit,
  evaluated_units: Number(values.evaluated_units),
  sampling_method: values.sampling_method || null,
  notes: values.notes || null,
  no_presence: values.no_presence,
  detections: values.no_presence
    ? []
    : values.detections.map((row) => {
        const isOther = row.pest_disease_id === OTHER_PEST_DISEASE;
        return {
          id: row.id,
          pest_disease_id: isOther ? null : row.pest_disease_id,
          other_description: isOther ? row.other_description : null,
          affected_units: Number(row.affected_units),
          control: controlRequest(row.control),
          control_requested: row.control.mode === 'requested',
        };
      }),
  captured_at: capturedAt,
});
