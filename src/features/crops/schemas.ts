import { z } from 'zod';

import { normalizeCatalogName } from '@/lib/format/search';

import {
  ageInMonths,
  densityPerHectare,
  formatCount,
  impossibleDensity,
  MAX_POSSIBLE_DENSITY,
  MANAGEMENT_SYSTEM_OPTIONS,
  PROPAGATION_OPTIONS,
  SHADE_TYPE_OPTIONS,
  STAGE_OPTIONS,
} from './characterization-rules';

export const MAX_PLANTING_LINES = 10;
export const MAX_TREES_PER_PLANTING = 1_000_000;
export const EARLIEST_PLANTING_YEAR = 1950;

export const MISSING_VARIETY_MESSAGE = 'Seleccione la variedad de cacao';
export const REPEATED_PLANTING_MESSAGE = 'Esta siembra ya está en la lista';
export const UNAVAILABLE_VARIETY_MESSAGE =
  'Esta variedad ya no está disponible. Elige otra del catálogo.';
export const MISSING_STAGE_MESSAGE =
  'Selecciona la etapa del ciclo productivo.';

const values = <T extends string>(
  options: readonly { value: T }[],
): [T, ...T[]] => options.map((option) => option.value) as [T, ...T[]];

// Las listas opcionales llegan vacías desde el formulario cuando no se elige nada; la API espera
// null.
const optionalChoice = <T extends string>(options: readonly { value: T }[]) =>
  z
    .union([z.literal(''), z.enum(values(options))])
    .transform((value) => (value === '' ? null : value));

const treeCountField = () =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'Ingresa el número de árboles con números enteros.')
    .transform(Number)
    .refine((count) => count >= 1, 'Debe haber al menos 1 árbol.')
    .refine(
      (count) => count <= MAX_TREES_PER_PLANTING,
      `Usa máximo ${formatCount(MAX_TREES_PER_PLANTING)} árboles.`,
    );

// `today` se recibe para decidir qué mes es futuro: así la regla no depende del reloj al probarla.
const plantingMonthField = (today: Date) =>
  z
    .string()
    // Sin un mes válido no hay con qué juzgar lo demás: se corta aquí con un solo mensaje.
    .refine((month) => ageInMonths(month, today) !== null, {
      message: 'Ingresa el mes y el año de siembra.',
      abort: true,
    })
    .refine(
      (month) => (ageInMonths(month, today) ?? 0) >= 0,
      'La fecha de siembra no puede ser futura.',
    )
    .refine(
      (month) => Number(month.slice(0, 4)) >= EARLIEST_PLANTING_YEAR,
      `La fecha de siembra no puede ser anterior a ${EARLIEST_PLANTING_YEAR}.`,
    );

const plantingLine = (today: Date, unavailableIds: ReadonlySet<string>) =>
  z.object({
    variety_id: z
      .string()
      .min(1, MISSING_VARIETY_MESSAGE)
      .refine((id) => !unavailableIds.has(id), UNAVAILABLE_VARIETY_MESSAGE),
    planting_date: plantingMonthField(today),
    tree_count: treeCountField(),
    propagation: z.enum(values(PROPAGATION_OPTIONS)),
    // Vacía mientras no se elige: la fila nueva arranca así, y la API no la acepta.
    stage: z
      .union([z.literal(''), z.enum(values(STAGE_OPTIONS))])
      .transform((stage, context) => {
        if (stage !== '') return stage;
        context.addIssue({ code: 'custom', message: MISSING_STAGE_MESSAGE });
        return z.NEVER;
      }),
  });

export const impossibleDensityMessage = (density: number) =>
  `Con ${formatCount(density)} árboles/ha la densidad no es posible: el máximo es ${formatCount(MAX_POSSIBLE_DENSITY)}. Revisa el número de árboles o el área de la parcela.`;

type CharacterizationSchemaOptions = {
  // El área declarada de la parcela: contra ella se calcula la densidad.
  areaHectares: string;
  // Las variedades que el servidor ya no aceptaría en esta ficha (desactivadas que su ficha no
  // tenía); enviarlas solo devolvería el registro a la bandeja.
  unavailableIds?: ReadonlySet<string>;
};

export const createCharacterizationFormSchema = (
  today: Date,
  { areaHectares, unavailableIds = new Set() }: CharacterizationSchemaOptions,
) =>
  z.object({
    plantings: z
      .array(plantingLine(today, unavailableIds))
      .min(1, MISSING_VARIETY_MESSAGE)
      .max(
        MAX_PLANTING_LINES,
        `Puedes registrar hasta ${MAX_PLANTING_LINES} siembras.`,
      )
      .superRefine((lines, context) => {
        // La misma variedad en otro mes es otra tanda; en el mismo mes, un repetido.
        const seen = new Set<string>();
        lines.forEach((line, index) => {
          if (!line.variety_id) return;
          const key = `${line.variety_id}|${line.planting_date}`;
          if (seen.has(key)) {
            context.addIssue({
              code: 'custom',
              path: [index, 'variety_id'],
              message: REPEATED_PLANTING_MESSAGE,
            });
          }
          seen.add(key);
        });
        const trees = lines.reduce((sum, line) => sum + line.tree_count, 0);
        if (impossibleDensity(trees, areaHectares)) {
          context.addIssue({
            code: 'custom',
            message: impossibleDensityMessage(
              densityPerHectare(trees, areaHectares) ?? trees,
            ),
          });
        }
      }),
    management_system: optionalChoice(MANAGEMENT_SYSTEM_OPTIONS),
    shade_type: optionalChoice(SHADE_TYPE_OPTIONS),
  });

export type CharacterizationFormInput = z.input<
  ReturnType<typeof createCharacterizationFormSchema>
>;
export type CharacterizationFormFields = z.output<
  ReturnType<typeof createCharacterizationFormSchema>
>;

export const VARIETY_NAME_MAX_LENGTH = 60;
export const MAX_COMMON_NAMES = 5;
export const COMMON_NAME_MAX_LENGTH = 60;
export const VARIETY_DESCRIPTION_MAX_LENGTH = 200;
export const DUPLICATE_VARIETY_MESSAGE =
  'Ya existe una variedad con este nombre';

// `takenNames`: los nombres (ya normalizados) de las demás variedades del catálogo. El servidor
// repite la comprobación con todas.
export const createVarietyFormSchema = (takenNames: ReadonlySet<string>) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Ingresa el nombre de la variedad.')
      .max(
        VARIETY_NAME_MAX_LENGTH,
        `Usa máximo ${VARIETY_NAME_MAX_LENGTH} caracteres.`,
      )
      .refine(
        (name) => !takenNames.has(normalizeCatalogName(name)),
        DUPLICATE_VARIETY_MESSAGE,
      ),
    // Se escriben separados por coma. Pueden repetirse entre variedades (de un mismo lugar salen
    // varios clones); dentro de una, el repetido sobra.
    common_names: z
      .string()
      .transform(splitCommonNames)
      .pipe(
        z
          .array(
            z
              .string()
              .max(
                COMMON_NAME_MAX_LENGTH,
                `Cada nombre común lleva máximo ${COMMON_NAME_MAX_LENGTH} caracteres.`,
              ),
          )
          .max(
            MAX_COMMON_NAMES,
            `Escribe hasta ${MAX_COMMON_NAMES} nombres comunes.`,
          ),
      ),
    description: z
      .string()
      .trim()
      .max(
        VARIETY_DESCRIPTION_MAX_LENGTH,
        `Usa máximo ${VARIETY_DESCRIPTION_MAX_LENGTH} caracteres.`,
      ),
  });

export type VarietyFormInput = z.input<
  ReturnType<typeof createVarietyFormSchema>
>;
export type VarietyFormValues = z.output<
  ReturnType<typeof createVarietyFormSchema>
>;

function splitCommonNames(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(',')
    .map((name) => name.trim())
    .filter((name) => {
      const key = normalizeCatalogName(name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
