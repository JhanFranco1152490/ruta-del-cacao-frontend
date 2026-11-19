import { WEATHER_LABELS } from '@/lib/drying-weather';
import { formatShortDate, formatShortDateTime } from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';
import {
  moistureText,
  phText,
  temperatureText,
} from '@/lib/postharvest/measure-text';

import type { StageOf } from '../api';

type Fermentation = StageOf<'fermentation'>['fermentation'];
type Turn = Fermentation['turns'][number];
type DryingLog = StageOf<'drying'>['drying']['logs'][number];

// Un rango de mediciones, «38,0–47,5 °C», o una sola si el mínimo y el máximo coinciden. Sin
// mediciones (aún no hay volteos) no hay rango.
function rangeText(
  min: string | null,
  max: string | null,
  format: (value: string) => string,
) {
  if (min === null || max === null) return null;
  if (Number(min) === Number(max)) return format(min);
  return `${format(min)}–${format(max)}`;
}

export function temperatureRangeText({
  temperature_min_c,
  temperature_max_c,
}: Fermentation) {
  const range = rangeText(temperature_min_c, temperature_max_c, (value) =>
    formatFixedDecimal(value, 1),
  );
  return range && `${range} °C`;
}

export const phRangeText = ({ ph_min, ph_max }: Fermentation) =>
  rangeText(ph_min, ph_max, phText);

export const countText = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

// Lo que dice el botón que despliega los registros: «Ver el volteo» o «Ver los 4 volteos».
export const showRecordsText = (count: number, one: string, many: string) =>
  count === 1 ? `Ver el ${one}` : `Ver los ${count} ${many}`;

// Un volteo en su tarjeta: «17 mar. 08:00 · 42,0 °C · pH 4,90».
export const turnText = ({ turned_at, temperature_c, ph }: Turn) =>
  `${formatShortDateTime(turned_at)} · ${temperatureText(temperature_c)} · pH ${phText(ph)}`;

// Un día de la bitácora: «Día 1 · 21 mar · 40,0 % · 6,0 h de sol · Soleado».
export const dryingLogText = ({
  day_number,
  log_date,
  moisture_pct,
  sun_hours,
  weather,
}: DryingLog) =>
  [
    `Día ${day_number}`,
    formatShortDate(log_date),
    moistureText(moisture_pct),
    `${formatFixedDecimal(sun_hours, 1)} h de sol`,
    WEATHER_LABELS[weather],
  ].join(' · ');
