import { normalizeCatalogName } from '@/lib/format/search';

import { activityTitle } from './activity-labels';
import type { AgriculturalActivity } from './api';
import type { QueuedCompletion } from './completion-queue';
import type { CompletionFormInput } from './completion-rules';
import { COMPLETION_INPUT_INACTIVE_CODE } from './sync-adapter';

// Lo que la realización necesita saber de un insumo del catálogo.
export type CatalogInput = {
  id: string;
  name: string;
  unit: string;
  package_type: string | null;
  package_size: string | null;
  is_active: boolean;
};

export const UNAVAILABLE_INPUT_MESSAGE =
  'Este insumo ya no está disponible. Elige otro del catálogo.';

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

export type InputChoice = { id: string; label: string; disabled: boolean };

// Los insumos que ofrece una fila: los activos que calzan con lo buscado (sin tildes, mayúsculas
// ni espacios, como en el catálogo), más el que la fila ya tiene elegido aunque no calce. Los que
// ya están en otra fila se ven, pero no se pueden elegir dos veces.
export function inputChoices(
  catalog: readonly CatalogInput[],
  {
    search,
    selectedId,
    takenIds,
  }: { search: string; selectedId: string; takenIds: ReadonlySet<string> },
): InputChoice[] {
  const wanted = normalizeCatalogName(search);
  return catalog
    .filter(
      (input) =>
        input.id === selectedId ||
        (input.is_active && normalizeCatalogName(input.name).includes(wanted)),
    )
    .map((input) => {
      const taken = input.id !== selectedId && takenIds.has(input.id);
      return {
        id: input.id,
        label: taken ? `${input.name} · Ya en la lista` : input.name,
        disabled: taken,
      };
    });
}
