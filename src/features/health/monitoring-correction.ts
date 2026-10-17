import { formatDayMonth } from '@/lib/format/dates';

import {
  type ControlFormInput,
  emptyControl,
  type MonitoringFormInput,
} from './monitoring-form';
import type { QueuedMonitoring } from './monitoring-queue';
import type { MonitoringResultRequest } from './monitoring-request';
import { OTHER_PEST_DISEASE } from './monitoring-rules';
import { HEALTH_ERROR } from './monitoring-api';

type DetectionRequest = NonNullable<
  MonitoringResultRequest['detections']
>[number];

// Cómo se nombra un monitoreo fuera de su pantalla (en la bandeja): "P-03 · 19 de octubre".
export const monitoringLabel = (plotCode: string, doneDate: string) =>
  `${plotCode} · ${formatDayMonth(doneDate)}`;

// Los ids que el servidor rechazó por inactivos con el código `code`.
function rejectedIds(
  queued: QueuedMonitoring,
  code: string,
  key: 'pest_disease_ids' | 'input_ids',
): ReadonlySet<string> {
  if (queued.errorCode !== code) return new Set();
  const data = queued.errorData as Record<string, string[]> | undefined;
  return new Set(data?.[key] ?? []);
}

// El control tal como se capturó. Uno pedido a quien programa, o ninguno, no viajó con un `id`:
// se le da uno nuevo, porque el formulario siempre tiene uno. Un insumo rechazado por inactivo
// pierde su elección y conserva su cantidad: al guardar se pide elegir otro.
function controlOf(
  row: DetectionRequest,
  newId: () => string,
  goneInputs: ReadonlySet<string>,
): ControlFormInput {
  const keep = (id: string | null | undefined) =>
    id && !goneInputs.has(id) ? id : '';
  const { control } = row;
  if (!control) {
    return {
      ...emptyControl(newId()),
      mode: row.control_requested ? 'requested' : 'none',
    };
  }
  return {
    ...emptyControl(control.id),
    mode: control.mode,
    method: control.method ?? '',
    method_description: control.method_description ?? '',
    inputs: (control.inputs ?? []).map(({ input_id, quantity }) => ({
      input_id: keep(input_id),
      quantity,
    })),
    scheduled_date: control.scheduled_date ?? '',
    assignee_id: control.assignee_id ?? '',
    planned_input_id: keep(control.planned_input_id),
  };
}

// Lo capturado que sigue en el dispositivo, para corregirlo. Una plaga que ya no se puede elegir
// (el servidor la rechazó, o dejó de estar entre las activas del catálogo) pierde su elección pero
// conserva el resto de la detección: `unavailableRows` dice qué detecciones hay que volver a elegir.
// Sin el catálogo en el dispositivo (`activeIds` sin definir) no se puede saber cuáles siguen
// activas, y solo se marcan las que rechazó el servidor.
export function queuedToMonitoringForm(
  queued: QueuedMonitoring,
  activeIds: ReadonlySet<string> | undefined,
  newId: () => string,
): { values: MonitoringFormInput; unavailableRows: number[] } {
  const rejected = rejectedIds(
    queued,
    HEALTH_ERROR.pestDiseaseInactive,
    'pest_disease_ids',
  );
  const goneInputs = rejectedIds(
    queued,
    HEALTH_ERROR.inputInactive,
    'input_ids',
  );
  const unavailableRows: number[] = [];
  const { request } = queued;
  const detections = (request.detections ?? []).map((row, index) => {
    const pestId = row.pest_disease_id ?? null;
    const gone =
      pestId !== null &&
      (rejected.has(pestId) ||
        (activeIds !== undefined && !activeIds.has(pestId)));
    if (gone) unavailableRows.push(index);
    return {
      id: row.id,
      pest_disease_id:
        pestId === null ? OTHER_PEST_DISEASE : gone ? '' : pestId,
      other_description: row.other_description ?? '',
      affected_units: String(row.affected_units),
      control: controlOf(row, newId, goneInputs),
    };
  });
  return {
    values: {
      done_date: request.done_date,
      sampling_unit: request.sampling_unit,
      evaluated_units: String(request.evaluated_units),
      sampling_method: request.sampling_method ?? '',
      no_presence: request.no_presence ?? false,
      notes: request.notes ?? '',
      detections,
    },
    unavailableRows,
  };
}
