import { z } from 'zod';

import { normalizeCatalogName } from '@/lib/format/search';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';

import {
  BAG_UNIT,
  INPUT_TYPE_OPTIONS,
  INPUT_UNIT_OPTIONS,
  type InputType,
  type InputUnit,
} from './input-options';

export const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
export const MISSING_FIELDS_MESSAGE = 'Complete los datos obligatorios';
export const DUPLICATE_INPUT_MESSAGE =
  'Ya existe un insumo con este nombre y tipo';

export const INPUT_NAME_MIN_LENGTH = 2;
export const INPUT_NAME_MAX_LENGTH = 80;
export const BAG_WEIGHT_MIN_KG = 1;
export const BAG_WEIGHT_MAX_KG = 100;
const BAG_WEIGHT_DECIMALS = 2;

// Nombre y tipo identifican un insumo dentro del catálogo: el mismo nombre con otro tipo es otro.
export const inputDuplicateKey = (name: string, inputType: string) =>
  `${inputType}:${normalizeCatalogName(name)}`;

type CatalogInput = { id: string; name: string; input_type: string };

// El insumo del catálogo que ya tiene ese nombre y tipo, sin contar el que se está editando.
export function findDuplicateInput<T extends CatalogInput>(
  catalog: readonly T[],
  { name, input_type }: { name: string; input_type: string },
  ignoreId?: string,
): T | undefined {
  const key = inputDuplicateKey(name, input_type);
  return catalog.find(
    (input) =>
      input.id !== ignoreId &&
      inputDuplicateKey(input.name, input.input_type) === key,
  );
}

const values = <T extends string>(
  options: readonly { value: T }[],
): [T, ...T[]] => options.map((option) => option.value) as [T, ...T[]];

// Las listas llegan vacías al abrir el formulario: vacío y un valor desconocido se señalan igual.
const requiredChoice = <T extends string>(options: readonly { value: T }[]) =>
  z
    .union([z.literal(''), z.enum(values(options))], {
      error: REQUIRED_FIELD_MESSAGE,
    })
    .refine((value) => value !== '', REQUIRED_FIELD_MESSAGE)
    .transform((value) => value as T);

const nameField = () =>
  z
    .string()
    .trim()
    .superRefine((name, context) => {
      const message = !name
        ? REQUIRED_FIELD_MESSAGE
        : name.length < INPUT_NAME_MIN_LENGTH
          ? `Escribe al menos ${INPUT_NAME_MIN_LENGTH} caracteres.`
          : name.length > INPUT_NAME_MAX_LENGTH
            ? `Usa máximo ${INPUT_NAME_MAX_LENGTH} caracteres.`
            : null;
      if (message) context.addIssue({ code: 'custom', message });
    });

function bagWeightError(weight: string): string | null {
  if (!weight) return REQUIRED_FIELD_MESSAGE;
  const kg = Number(weight);
  if (!isDecimal(weight) || kg < BAG_WEIGHT_MIN_KG || kg > BAG_WEIGHT_MAX_KG) {
    return `El peso del bulto va de ${BAG_WEIGHT_MIN_KG} a ${BAG_WEIGHT_MAX_KG} kg.`;
  }
  if (!decimalPattern(BAG_WEIGHT_DECIMALS).test(weight)) {
    return `Usa máximo ${BAG_WEIGHT_DECIMALS} decimales.`;
  }
  return null;
}

// `takenKeys`: las claves (`inputDuplicateKey`) de los demás insumos del catálogo. El servidor
// repite la comprobación con todos.
export const createInputFormSchema = (takenKeys: ReadonlySet<string>) =>
  z
    .object({
      name: nameField(),
      input_type: requiredChoice(INPUT_TYPE_OPTIONS),
      unit: requiredChoice(INPUT_UNIT_OPTIONS),
      bag_weight_kg: decimalText(),
    })
    .superRefine(({ name, input_type, unit, bag_weight_kg }, context) => {
      if (takenKeys.has(inputDuplicateKey(name, input_type))) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: DUPLICATE_INPUT_MESSAGE,
        });
      }
      const weightError =
        unit === BAG_UNIT ? bagWeightError(bag_weight_kg) : null;
      if (weightError) {
        context.addIssue({
          code: 'custom',
          path: ['bag_weight_kg'],
          message: weightError,
        });
      }
    })
    // El peso solo existe para el bulto: con otra unidad viaja vacío, como lo espera la API.
    .transform(({ bag_weight_kg, ...input }) => ({
      ...input,
      bag_weight_kg: input.unit === BAG_UNIT ? bag_weight_kg : null,
    }));

export type InputFormInput = {
  name: string;
  input_type: InputType | '';
  unit: InputUnit | '';
  bag_weight_kg: string;
};
export type InputFormValues = z.output<
  ReturnType<typeof createInputFormSchema>
>;
