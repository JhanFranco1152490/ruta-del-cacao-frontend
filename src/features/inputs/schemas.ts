import { z } from 'zod';

import { normalizeCatalogName } from '@/lib/format/search';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';

import {
  INPUT_TYPE_OPTIONS,
  INPUT_UNIT_OPTIONS,
  PACKAGE_TYPE_OPTIONS,
  type InputType,
  type InputUnit,
  type PackageType,
} from './input-options';

export const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
export const MISSING_FIELDS_MESSAGE = 'Complete los datos obligatorios';
export const DUPLICATE_INPUT_MESSAGE =
  'Ya existe un insumo con este nombre y tipo';

export const INPUT_NAME_MIN_LENGTH = 2;
export const INPUT_NAME_MAX_LENGTH = 80;
export const PACKAGE_SIZE_MIN = 0.001;
export const PACKAGE_SIZE_MAX = 100_000;
const PACKAGE_SIZE_DECIMALS = 3;

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

// La presentación es opcional: vacía viaja como null.
const optionalChoice = <T extends string>(options: readonly { value: T }[]) =>
  z
    .union([z.literal(''), z.enum(values(options))], {
      error: 'Elige una opción de la lista.',
    })
    .transform((value) => (value === '' ? null : value));

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

function packageSizeError(size: string): string | null {
  const amount = Number(size);
  if (
    !isDecimal(size) ||
    amount < PACKAGE_SIZE_MIN ||
    amount > PACKAGE_SIZE_MAX
  ) {
    return 'El contenido va de 0,001 a 100.000.';
  }
  if (!decimalPattern(PACKAGE_SIZE_DECIMALS).test(size)) {
    return `Usa máximo ${PACKAGE_SIZE_DECIMALS} decimales.`;
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
      package_type: optionalChoice(PACKAGE_TYPE_OPTIONS),
      package_size: decimalText(),
    })
    .superRefine(
      ({ name, input_type, package_type, package_size }, context) => {
        const issue = (path: string, message: string) =>
          context.addIssue({ code: 'custom', path: [path], message });
        if (takenKeys.has(inputDuplicateKey(name, input_type))) {
          issue('name', DUPLICATE_INPUT_MESSAGE);
        }
        // Empaque y contenido van juntos: uno sin el otro no dice cómo viene el insumo.
        if (package_type && !package_size) {
          issue('package_size', REQUIRED_FIELD_MESSAGE);
        }
        if (package_size) {
          if (!package_type) issue('package_type', REQUIRED_FIELD_MESSAGE);
          const sizeError = packageSizeError(package_size);
          if (sizeError) issue('package_size', sizeError);
        }
      },
    )
    .transform(({ package_size, ...input }) => ({
      ...input,
      package_size: input.package_type ? package_size : null,
    }));

export type InputFormInput = {
  name: string;
  input_type: InputType | '';
  unit: InputUnit | '';
  package_type: PackageType | '';
  package_size: string;
};
export type InputFormValues = z.output<
  ReturnType<typeof createInputFormSchema>
>;
