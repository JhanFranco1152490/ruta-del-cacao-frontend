import { formatDecimal } from '@/lib/format/decimal';

const DASH = '—';

// Los kilos llegan con un decimal: «620.0» se lee «620 kg» y «144.5», «144,5 kg».
export const formatKg = (value: string) => `${formatDecimal(value, 1)} kg`;

export const formatKgPerHectare = (value: string | null) =>
  value === null ? DASH : `${formatDecimal(value, 1)} kg/ha`;

// Sin nada clasificado no hay porcentaje: «sin datos» no es «0 %».
export const formatShare = (value: string | null) =>
  value === null ? DASH : `${formatDecimal(value, 1)} %`;

const SHORT_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

// «2026-03» como «mar»; con el año en enero y en el primer mes del gráfico, para que un rango de
// más de un año no repita nombres sin decir de cuál.
export function monthTick(month: string, isFirst: boolean) {
  const [year, number] = month.split('-');
  const name = SHORT_MONTHS[Number(number) - 1];
  return number === '01' || isFirst ? `${name} ${year.slice(2)}` : name;
}
