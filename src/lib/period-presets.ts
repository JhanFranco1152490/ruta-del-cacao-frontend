import { monthBounds, shiftMonth, todayInBogota } from '@/lib/format/dates';

// Los atajos de periodo de lo que se calcula al consultar (indicadores, reportes): unos pocos rangos
// que siempre terminan hoy. El servidor acepta hasta 366 días y cada uno de estos cabe. El año abre
// primero porque es lo que suele consultarse.
export const PERIOD_PRESETS = ['year', '12m', '6m', '3m'] as const;
export type PeriodPreset = (typeof PERIOD_PRESETS)[number];
export const DEFAULT_PERIOD_PRESET: PeriodPreset = 'year';

export const PERIOD_PRESET_OPTIONS: readonly {
  value: PeriodPreset;
  label: string;
}[] = [
  { value: 'year', label: 'Este año' },
  { value: '12m', label: '12 meses' },
  { value: '6m', label: '6 meses' },
  { value: '3m', label: '3 meses' },
];

const MONTHS_BACK: Record<Exclude<PeriodPreset, 'year'>, number> = {
  '12m': 11,
  '6m': 5,
  '3m': 2,
};

// Del primer día del mes que abre el rango hasta hoy: «3 meses» es este mes y los dos anteriores,
// completos, para que el primer mes de un gráfico no salga a medias.
export function presetBounds(
  preset: PeriodPreset,
  today: string = todayInBogota(),
) {
  if (preset === 'year')
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const firstMonth = shiftMonth(today.slice(0, 7), -MONTHS_BACK[preset]);
  return { from: monthBounds(firstMonth).from, to: today };
}
