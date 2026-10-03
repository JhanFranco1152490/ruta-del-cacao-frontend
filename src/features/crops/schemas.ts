import { z } from 'zod';

import {
  ageInMonths,
  formatCount,
  MANAGEMENT_SYSTEM_OPTIONS,
  SHADE_TYPE_OPTIONS,
  STAGE_OPTIONS,
} from './characterization-rules';

export const MAX_VARIETY_LINES = 10;
export const MAX_TREES_PER_VARIETY = 1_000_000;
export const EARLIEST_PLANTING_YEAR = 1950;

export const MISSING_VARIETY_MESSAGE = 'Seleccione la variedad de cacao';
export const REPEATED_VARIETY_MESSAGE = 'Esta variedad ya está en la lista';
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
      (count) => count <= MAX_TREES_PER_VARIETY,
      `Usa máximo ${formatCount(MAX_TREES_PER_VARIETY)} árboles.`,
    );

const varietyLine = z.object({
  variety_id: z.string().min(1, MISSING_VARIETY_MESSAGE),
  tree_count: treeCountField(),
});

// `today` se recibe para decidir qué mes es futuro: así la regla no depende del reloj al probarla.
export const createCharacterizationFormSchema = (today: Date) =>
  z.object({
    varieties: z
      .array(varietyLine)
      .min(1, MISSING_VARIETY_MESSAGE)
      .max(
        MAX_VARIETY_LINES,
        `Puedes registrar hasta ${MAX_VARIETY_LINES} variedades.`,
      )
      .superRefine((lines, context) => {
        const seen = new Set<string>();
        lines.forEach((line, index) => {
          if (!line.variety_id) return;
          if (seen.has(line.variety_id)) {
            context.addIssue({
              code: 'custom',
              path: [index, 'variety_id'],
              message: REPEATED_VARIETY_MESSAGE,
            });
          }
          seen.add(line.variety_id);
        });
      }),
    planting_date: z
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
      ),
    // Vacía mientras no se elige: el formulario arranca así, y la API no la acepta.
    stage: z
      .union([z.literal(''), z.enum(values(STAGE_OPTIONS))])
      .transform((stage, context) => {
        if (stage !== '') return stage;
        context.addIssue({ code: 'custom', message: MISSING_STAGE_MESSAGE });
        return z.NEVER;
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
