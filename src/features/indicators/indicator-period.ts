import { monthBounds, shiftMonth, todayInBogota } from '@/lib/format/dates';

// El periodo de un panel se elige entre unos pocos rangos que siempre terminan hoy: el servidor
// acepta hasta 366 días y cada uno de estos cabe. El año abre primero porque es lo que suele
// consultarse.
export const INDICATOR_PERIODS = ['year', '12m', '6m', '3m'] as const;
export type IndicatorPeriod = (typeof INDICATOR_PERIODS)[number];
export const DEFAULT_INDICATOR_PERIOD: IndicatorPeriod = 'year';

export const INDICATOR_PERIOD_OPTIONS: readonly {
  value: IndicatorPeriod;
  label: string;
}[] = [
  { value: 'year', label: 'Este año' },
  { value: '12m', label: '12 meses' },
  { value: '6m', label: '6 meses' },
  { value: '3m', label: '3 meses' },
];

const MONTHS_BACK: Record<Exclude<IndicatorPeriod, 'year'>, number> = {
  '12m': 11,
  '6m': 5,
  '3m': 2,
};

// Del primer día del mes que abre el rango hasta hoy: «3 meses» es este mes y los dos anteriores,
// completos, para que el primer mes del gráfico no salga a medias.
export function indicatorPeriodBounds(
  period: IndicatorPeriod,
  today: string = todayInBogota(),
) {
  if (period === 'year')
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const firstMonth = shiftMonth(today.slice(0, 7), -MONTHS_BACK[period]);
  return { from: monthBounds(firstMonth).from, to: today };
}
