import { activityTitle } from './activity-labels';
import type { AgriculturalActivity } from './api';
import type { QueuedCompletion } from './completion-queue';
import type { CompletionFormInput } from './completion-rules';
import { COMPLETION_INPUT_INACTIVE_CODE } from './sync-adapter';

// Cómo se nombra la labor fuera de su pantalla (en la bandeja): "Fertilización · P-03".
export const completionLabel = (
  activity: Pick<
    AgriculturalActivity,
    'activity_type' | 'other_description' | 'plot'
  >,
) => `${activityTitle(activity)} · ${activity.plot.code}`;

// Una realización nueva: la fecha de hoy y ningún insumo, porque no toda labor los usa.
export const emptyCompletionForm = (today: string): CompletionFormInput => ({
  done_date: today,
  inputs: [],
});

const inactiveInputIds = (queued: QueuedCompletion): readonly string[] => {
  if (queued.errorCode !== COMPLETION_INPUT_INACTIVE_CODE) return [];
  const data = queued.errorData as { input_ids?: string[] } | undefined;
  return data?.input_ids ?? [];
};

// Lo capturado que sigue en el dispositivo, para corregirlo. Un insumo que ya no se puede usar
// (el servidor lo rechazó, o dejó de estar entre los activos del catálogo) pierde su elección pero
// conserva su cantidad: `unavailableRows` dice qué filas hay que volver a elegir.
export function queuedToFormInput(
  queued: QueuedCompletion,
  availableIds: ReadonlySet<string>,
): { values: CompletionFormInput; unavailableRows: number[] } {
  const rejected = new Set(inactiveInputIds(queued));
  const unavailableRows: number[] = [];
  const inputs = (queued.request.inputs ?? []).map((row, index) => {
    if (!rejected.has(row.input_id) && availableIds.has(row.input_id)) {
      return { input_id: row.input_id, quantity: row.quantity };
    }
    unavailableRows.push(index);
    return { input_id: '', quantity: row.quantity };
  });
  return {
    values: { done_date: queued.request.done_date, inputs },
    unavailableRows,
  };
}
