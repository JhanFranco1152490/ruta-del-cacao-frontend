import type { UsedInputRow } from '@/lib/input-usage';

import type {
  ControlMethod,
  SamplingMethod,
  SamplingUnit,
} from './monitoring-rules';

// El control de una detección en la planilla: ninguno por ahora, hecho en el momento, programado
// para después, o pedido a quien programa (lo que ve quien no puede programar).
export type ControlMode = 'none' | 'done' | 'scheduled' | 'requested';

export type ControlFormInput = {
  // Lo genera el dispositivo al crear la fila: un reintento no duplica el control.
  id: string;
  mode: ControlMode;
  method: '' | ControlMethod;
  method_description: string;
  inputs: UsedInputRow[];
  scheduled_date: string;
  assignee_id: string;
  planned_input_id: string;
};

export type DetectionFormInput = {
  // Lo genera el dispositivo: así se puede programar un control desde ella aunque el monitoreo
  // siga en la cola.
  id: string;
  // El id del catálogo, `OTHER_PEST_DISEASE` u vacío mientras no se elige.
  pest_disease_id: string;
  other_description: string;
  affected_units: string;
  control: ControlFormInput;
};

export type MonitoringFormInput = {
  done_date: string;
  sampling_unit: SamplingUnit;
  evaluated_units: string;
  sampling_method: '' | SamplingMethod;
  no_presence: boolean;
  notes: string;
  detections: DetectionFormInput[];
};

export const emptyControl = (id: string): ControlFormInput => ({
  id,
  mode: 'none',
  method: '',
  method_description: '',
  inputs: [],
  scheduled_date: '',
  assignee_id: '',
  planned_input_id: '',
});

export const emptyDetection = (
  id: string,
  controlId: string,
): DetectionFormInput => ({
  id,
  pest_disease_id: '',
  other_description: '',
  affected_units: '',
  control: emptyControl(controlId),
});

// Una planilla nueva: hoy, árboles y una detección vacía, porque casi siempre se encuentra algo.
export const emptyMonitoringForm = (
  today: string,
  newId: () => string,
): MonitoringFormInput => ({
  done_date: today,
  sampling_unit: 'trees',
  evaluated_units: '',
  sampling_method: '',
  no_presence: false,
  notes: '',
  detections: [emptyDetection(newId(), newId())],
});
