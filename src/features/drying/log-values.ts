import type { components } from '@/lib/api/schema';
import { fromBogotaLocal, toBogotaLocal } from '@/lib/format/dates';
import { minuteOf } from '@/lib/format/hours';

import type { Weather } from './api';
import type { LogFormInput, LogFormValues } from './log-form';

type LogUpdate = Omit<
  components['schemas']['PatchedDryingLogUpdateRequest'],
  'expected_version'
>;

// Lo que se guarda de una bitácora, venga del servidor o de la cola.
type LogContent = {
  measured_at: string;
  moisture_pct: string;
  sun_hours: string;
  shade_hours?: string | null;
  turn_count: number;
  turn_frequency_hours?: string | null;
  weather: Weather;
  notes?: string;
};

// La API escribe los decimales con punto; el formulario, con la coma del español.
const withComma = (decimal: string | null | undefined) =>
  (decimal ?? '').replace('.', ',');

export const startLogForm = (now: Date): LogFormInput => ({
  measured_at: toBogotaLocal(now.toISOString()),
  moisture_pct: '',
  sun_hours: '',
  shade_hours: '',
  turn_count: '',
  turn_frequency_hours: '',
  weather: '',
  notes: '',
});

export const formOfLog = (log: LogContent): LogFormInput => ({
  measured_at: toBogotaLocal(log.measured_at),
  moisture_pct: withComma(log.moisture_pct),
  sun_hours: withComma(log.sun_hours),
  shade_hours: withComma(log.shade_hours),
  turn_count: String(log.turn_count),
  turn_frequency_hours: withComma(log.turn_frequency_hours),
  weather: log.weather,
  notes: log.notes ?? '',
});

const sameNumber = (
  a: string | null | undefined,
  b: string | null | undefined,
) =>
  (a ?? '') === (b ?? '') ||
  (a !== null && a !== undefined && a !== '' && Number(a) === Number(b));

// Al corregir una bitácora del servidor se envía solo lo que cambió: «12» y «12.0» son lo mismo.
export function logChanges(values: LogFormValues, log: LogContent): LogUpdate {
  const measuredAt = fromBogotaLocal(values.measured_at);
  const changes: LogUpdate = {};
  if (minuteOf(measuredAt) !== minuteOf(log.measured_at)) {
    changes.measured_at = measuredAt;
  }
  if (!sameNumber(values.moisture_pct, log.moisture_pct)) {
    changes.moisture_pct = values.moisture_pct;
  }
  if (!sameNumber(values.sun_hours, log.sun_hours)) {
    changes.sun_hours = values.sun_hours;
  }
  const shade = values.shade_hours || null;
  if (!sameNumber(shade, log.shade_hours ?? null)) changes.shade_hours = shade;
  const turns = Number(values.turn_count);
  if (turns !== log.turn_count) changes.turn_count = turns;
  const frequency = turns > 0 ? values.turn_frequency_hours : null;
  if (!sameNumber(frequency, log.turn_frequency_hours ?? null)) {
    changes.turn_frequency_hours = frequency;
  }
  if (values.weather !== log.weather)
    changes.weather = values.weather as Weather;
  if (values.notes !== (log.notes ?? '')) changes.notes = values.notes;
  return changes;
}
