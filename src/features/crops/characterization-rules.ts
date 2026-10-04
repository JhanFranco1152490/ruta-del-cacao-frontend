import { differenceInCalendarMonths } from 'date-fns';

import type { components } from '@/lib/api/schema';
import { isDecimal } from '@/lib/validation/decimal';

type Schemas = components['schemas'];
export type Stage = Schemas['StageEnum'];
export type ManagementSystem = Schemas['ManagementSystemEnum'];
export type ShadeType = Schemas['ShadeTypeEnum'];

// Las etiquetas son de la interfaz; los valores, de la API: `satisfies` avisa al compilar si la
// API cambia o agrega una opción que aquí no está.
type Option<T extends string> = { value: T; label: string };

export const STAGE_OPTIONS = [
  { value: 'establishment', label: 'Establecimiento o formación' },
  { value: 'early_production', label: 'Inicio de producción' },
  { value: 'full_production', label: 'Producción estable' },
  { value: 'renovation', label: 'Renovación o rehabilitación' },
] as const satisfies readonly Option<Stage>[];

export const MANAGEMENT_SYSTEM_OPTIONS = [
  { value: 'conventional', label: 'Convencional' },
  { value: 'organic', label: 'Orgánico' },
  { value: 'in_transition', label: 'En transición a orgánico' },
] as const satisfies readonly Option<ManagementSystem>[];

export const SHADE_TYPE_OPTIONS = [
  { value: 'none', label: 'A plena exposición' },
  { value: 'temporary', label: 'Sombra temporal (plátano, yuca)' },
  { value: 'permanent', label: 'Sombra permanente (maderables o frutales)' },
  { value: 'mixed', label: 'Temporal y permanente' },
] as const satisfies readonly Option<ShadeType>[];

const PRODUCTION_STAGES: ReadonlySet<Stage> = new Set([
  'early_production',
  'full_production',
]);

// Los clones empiezan a producir hacia los dos años, y a los cinco un cultivo ya no está en
// formación.
const MIN_PRODUCTION_AGE_MONTHS = 24;
const MAX_ESTABLISHMENT_AGE_MONTHS = 60;

// Rango habitual de siembra: a 3 x 3 m salen unas 1.100 plantas por hectárea. Fuera de él suele
// haber un error de digitación, pero también hay sistemas agroforestales ralos y siembras densas
// reales: por eso solo se avisa.
export const MIN_USUAL_DENSITY = 400;
export const MAX_USUAL_DENSITY = 1600;

const COUNT = new Intl.NumberFormat('es', { useGrouping: 'always' });

export const formatCount = (value: number) => COUNT.format(value);

// La fecha de siembra se escribe como mes (`AAAA-MM`). Meses cumplidos hasta hoy; negativo si el
// mes está en el futuro, y null si el texto no es un mes.
export function ageInMonths(plantingMonth: string, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})$/.exec(plantingMonth);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return differenceInCalendarMonths(
    today,
    new Date(Number(match[1]), month - 1, 1),
  );
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function formatAge(months: number): string {
  if (months < 1) return 'menos de un mes';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return plural(rest, 'mes', 'meses');
  const yearsText = plural(years, 'año', 'años');
  return rest === 0
    ? yearsText
    : `${yearsText} y ${plural(rest, 'mes', 'meses')}`;
}

export const totalTrees = (treeCounts: readonly number[]) =>
  treeCounts.reduce(
    (sum, count) => sum + (Number.isFinite(count) ? count : 0),
    0,
  );

// Árboles por hectárea sobre el área declarada de la parcela, que llega como decimal en texto.
export function densityPerHectare(
  trees: number,
  areaHectares: string,
): number | null {
  if (!isDecimal(areaHectares)) return null;
  const area = Number(areaHectares);
  if (area <= 0) return null;
  return Math.round(trees / area);
}

// Para comparar nombres de variedades como lo hace el servidor: "CCN 51", "CCN51" y "ccn-51" son
// la misma.
export const normalizeVarietyName = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '');

const CCN51 = normalizeVarietyName('CCN-51');

export type CoherenceWarning = {
  code: 'density_out_of_range' | 'stage_age_mismatch' | 'ccn51_mixed';
  message: string;
};

export type CoherenceInput = {
  density: number | null;
  stage: Stage | null;
  ageMonths: number | null;
  varietyNames: readonly string[];
};

// Avisos que no bloquean el guardado: señalan datos poco usuales para que la persona los revise.
export function coherenceWarnings({
  density,
  stage,
  ageMonths,
  varietyNames,
}: CoherenceInput): CoherenceWarning[] {
  const warnings: CoherenceWarning[] = [];

  if (
    density !== null &&
    (density < MIN_USUAL_DENSITY || density > MAX_USUAL_DENSITY)
  ) {
    warnings.push({
      code: 'density_out_of_range',
      message: `Densidad de siembra fuera de rango habitual (${formatCount(density)} árboles/ha). Revisa el número de árboles o el área de la parcela.`,
    });
  }

  if (stage !== null && ageMonths !== null && ageMonths >= 0) {
    const tooYoungToProduce =
      PRODUCTION_STAGES.has(stage) && ageMonths < MIN_PRODUCTION_AGE_MONTHS;
    const tooOldForEstablishment =
      stage === 'establishment' && ageMonths > MAX_ESTABLISHMENT_AGE_MONTHS;
    if (tooYoungToProduce || tooOldForEstablishment) {
      warnings.push({
        code: 'stage_age_mismatch',
        message: `La etapa elegida no es la usual para un cultivo de ${formatAge(ageMonths)}.`,
      });
    }
  }

  // CCN-51 es un clon ordinario: mezclado con otros, afecta la calidad de los finos y de aroma.
  const distinct = new Set(varietyNames.map(normalizeVarietyName));
  if (distinct.has(CCN51) && distinct.size > 1) {
    warnings.push({
      code: 'ccn51_mixed',
      message:
        'Se recomienda sembrar CCN-51 en parcelas separadas de otros clones.',
    });
  }

  return warnings;
}
