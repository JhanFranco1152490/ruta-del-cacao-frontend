import { formatDecimal } from '@/lib/format/decimal';

type Range = { min: string; max: string };

// «55–60 %», «6,5–7,5 %».
export const rangeText = (range: Range) =>
  `${formatDecimal(range.min, 1)}–${formatDecimal(range.max, 1)} %`;

export const isOutsideRange = (value: string | number, range: Range) =>
  Number(value) < Number(range.min) || Number(value) > Number(range.max);

// La advertencia de la humedad de entrada fuera del rango del productor: no bloquea, pide confirmar.
export const entryMoistureWarning = (value: string, range: Range) =>
  `La humedad de entrada (${formatDecimal(value, 1)} %) está fuera del rango esperado (${rangeText(range)}). ¿Iniciar de todos modos?`;

// La línea informativa de la humedad final fuera de la meta: no bloquea, la HU no lo pide.
export const outOfTargetLine = (range: Range) =>
  `Fuera de la meta (${rangeText(range)}).`;
