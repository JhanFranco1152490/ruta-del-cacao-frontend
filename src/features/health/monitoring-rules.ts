import type { components } from '@/lib/api/schema';
import { formatDecimal } from '@/lib/format/decimal';
import { normalizeCatalogName } from '@/lib/format/search';

type Schemas = components['schemas'];
export type SamplingUnit = Schemas['SamplingUnitEnum'];
export type SamplingMethod = Schemas['SamplingMethodEnum'];
export type ControlMethod = Schemas['ControlMethodEnum'];

// Qué contó el capataz: un 24 % de árboles no es lo mismo que un 24 % de mazorcas.
export const SAMPLING_UNITS: Record<
  SamplingUnit,
  {
    option: string;
    singular: string;
    plural: string;
    affected: string;
    // "50 árboles evaluados", "1 mazorca evaluada".
    evaluated: { singular: string; plural: string };
  }
> = {
  trees: {
    option: 'Árboles',
    singular: 'árbol',
    plural: 'árboles',
    affected: 'Árboles afectados',
    evaluated: { singular: 'evaluado', plural: 'evaluados' },
  },
  pods: {
    option: 'Mazorcas',
    singular: 'mazorca',
    plural: 'mazorcas',
    affected: 'Mazorcas afectadas',
    evaluated: { singular: 'evaluada', plural: 'evaluadas' },
  },
};

export const SAMPLING_METHOD_OPTIONS: readonly {
  value: SamplingMethod;
  label: string;
}[] = [
  { value: 'zigzag', label: 'Zig-zag' },
  { value: 'five_of_gold', label: 'Cinco de oros' },
  { value: 'diagonal', label: 'Diagonal' },
  { value: 'all_units', label: 'Todas las unidades' },
];

// Qué se hizo contra una detección. "Poda sanitaria" es cortar lo enfermo para atacarla; la poda
// de mantenimiento se programa como una labor de poda.
export const CONTROL_METHOD_OPTIONS: readonly {
  value: ControlMethod;
  label: string;
}[] = [
  { value: 'fruit_removal', label: 'Remoción de frutos enfermos' },
  { value: 'sanitary_pruning', label: 'Poda sanitaria' },
  { value: 'product_application', label: 'Aplicación de producto' },
  { value: 'other', label: 'Otro' },
];

export const controlMethodLabel = (method: ControlMethod) =>
  CONTROL_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
  method;

// La opción fija del buscador para lo que no está en el catálogo. No es un id del catálogo: con
// ella la detección lleva el texto que escribió el capataz.
export const OTHER_PEST_DISEASE = 'other';

// Un número entero mayor que cero, como se cuentan árboles y mazorcas; `null` si no lo es.
export function parseUnits(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value > 0 ? value : null;
}

// `afectadas ÷ evaluadas × 100` con dos decimales y la mitad hacia arriba, como el servidor. Se
// calcula con enteros: en decimales de punto flotante 12,5 % podría quedar en 12,49.
export function incidencePercent(affected: number, evaluated: number) {
  const scaled = affected * 10_000;
  let hundredths = Math.floor(scaled / evaluated);
  if (2 * (scaled % evaluated) >= evaluated) hundredths += 1;
  const whole = Math.floor(hundredths / 100);
  return `${whole}.${String(hundredths % 100).padStart(2, '0')}`;
}

export const unitName = (unit: SamplingUnit, count: number) =>
  count === 1 ? SAMPLING_UNITS[unit].singular : SAMPLING_UNITS[unit].plural;

// "50 árboles evaluados", "1 mazorca evaluada".
export const evaluatedText = (unit: SamplingUnit, count: number) => {
  const { evaluated } = SAMPLING_UNITS[unit];
  const participle = count === 1 ? evaluated.singular : evaluated.plural;
  return `${count} ${unitName(unit, count)} ${participle}`;
};

// Lo que se ve junto a la fila mientras se escribe: "12 de 50 árboles · 24 %". `null` mientras
// falte un número o las afectadas pasen de las evaluadas, que se dice en el campo.
export function incidenceText(
  affectedText: string,
  evaluatedText: string,
  unit: SamplingUnit,
): string | null {
  const affected = parseUnits(affectedText);
  const evaluated = parseUnits(evaluatedText);
  if (affected === null || evaluated === null || affected > evaluated) {
    return null;
  }
  const percent = formatDecimal(incidencePercent(affected, evaluated), 2);
  return `${affected} de ${evaluated} ${unitName(unit, evaluated)} · ${percent} %`;
}

// Con qué se reconoce una detección repetida: la plaga del catálogo, o lo escrito en Otra
// comparado como los nombres del catálogo. `null` mientras no haya nada elegido ni escrito.
export function detectionKey({
  pest_disease_id,
  other_description,
}: {
  pest_disease_id: string;
  other_description: string;
}): string | null {
  if (!pest_disease_id) return null;
  if (pest_disease_id !== OTHER_PEST_DISEASE) return pest_disease_id;
  const written = normalizeCatalogName(other_description);
  return written ? `${OTHER_PEST_DISEASE}:${written}` : null;
}
