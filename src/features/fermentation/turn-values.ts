import type { components } from '@/lib/api/schema';
import { fromBogotaLocal, toBogotaLocal } from '@/lib/format/dates';

import type { TurnFormInput, TurnFormValues } from './turn-form';

type TurnUpdate = Omit<
  components['schemas']['PatchedFermentationTurnUpdateRequest'],
  'expected_version'
>;

// Lo que se guarda de un volteo, venga del servidor o de la cola.
type TurnContent = {
  turned_at: string;
  temperature_c: string;
  ph: string;
  notes?: string;
};

// La API escribe los decimales con punto; el formulario, con la coma del español.
const withComma = (decimal: string) => decimal.replace('.', ',');

export const startTurnForm = (now: Date): TurnFormInput => ({
  turned_at: toBogotaLocal(now.toISOString()),
  temperature_c: '',
  ph: '',
  notes: '',
});

export const formOfTurn = (turn: TurnContent): TurnFormInput => ({
  turned_at: toBogotaLocal(turn.turned_at),
  temperature_c: withComma(turn.temperature_c),
  ph: withComma(turn.ph),
  notes: turn.notes ?? '',
});

const sameMinute = (a: string, b: string) =>
  Math.floor(new Date(a).getTime() / 60_000) ===
  Math.floor(new Date(b).getTime() / 60_000);

// Al corregir un volteo del servidor se envía solo lo que cambió: «45» y «45.0» son lo mismo.
export function turnChanges(
  values: TurnFormValues,
  turn: TurnContent,
): TurnUpdate {
  const turnedAt = fromBogotaLocal(values.turned_at);
  const changes: TurnUpdate = {};
  if (!sameMinute(turnedAt, turn.turned_at)) changes.turned_at = turnedAt;
  if (Number(values.temperature_c) !== Number(turn.temperature_c)) {
    changes.temperature_c = values.temperature_c;
  }
  if (Number(values.ph) !== Number(turn.ph)) changes.ph = values.ph;
  if (values.notes !== (turn.notes ?? '')) changes.notes = values.notes;
  return changes;
}
