import { z } from 'zod';

import { normalizeCatalogName } from '@/lib/format/search';

import { CONTROL_METHOD_OPTIONS, SAMPLING_UNITS } from './monitoring-rules';
import type { PestDiseaseCreateRequest } from './pest-api';

export const PEST_DISEASE_NAME_MIN_LENGTH = 2;
export const PEST_DISEASE_NAME_MAX_LENGTH = 60;
export const SCIENTIFIC_NAME_MAX_LENGTH = 100;
export const PEST_DISEASE_DESCRIPTION_MAX_LENGTH = 300;
export const DUPLICATE_PEST_DISEASE_MESSAGE =
  'Ya existe una plaga o enfermedad con este nombre';

const maxLength = (length: number) => `Usa máximo ${length} caracteres.`;

// Vacío es "sin sugerencia". "Otro" no se ofrece como control recomendado: pide escribir qué se
// hizo, y una recomendación no puede escribirlo.
const SUGGESTED_UNITS = Object.keys(SAMPLING_UNITS) as ('trees' | 'pods')[];
export const SUGGESTED_METHOD_OPTIONS = CONTROL_METHOD_OPTIONS.filter(
  ({ value }) => value !== 'other',
);
const suggestedMethods = SUGGESTED_METHOD_OPTIONS.map(({ value }) => value);

// `takenNames`: los nombres (ya normalizados) de las demás del catálogo. El servidor repite la
// comprobación con todas. El tipo empieza vacío para que el formulario no elija por la persona.
export const createPestDiseaseFormSchema = (takenNames: ReadonlySet<string>) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Ingresa el nombre de la plaga o enfermedad.')
      .min(
        PEST_DISEASE_NAME_MIN_LENGTH,
        `Usa al menos ${PEST_DISEASE_NAME_MIN_LENGTH} caracteres.`,
      )
      .max(
        PEST_DISEASE_NAME_MAX_LENGTH,
        maxLength(PEST_DISEASE_NAME_MAX_LENGTH),
      )
      .refine(
        (name) => !takenNames.has(normalizeCatalogName(name)),
        DUPLICATE_PEST_DISEASE_MESSAGE,
      ),
    kind: z
      .enum(['pest', 'disease', ''] as const)
      .refine((kind) => kind !== '', {
        message: 'Elige si es plaga o enfermedad.',
      }),
    scientific_name: z
      .string()
      .trim()
      .max(SCIENTIFIC_NAME_MAX_LENGTH, maxLength(SCIENTIFIC_NAME_MAX_LENGTH)),
    // Es lo que permite reconocerla en campo aunque no se recuerde el nombre: el buscador de la
    // planilla la muestra debajo de cada opción.
    description: z
      .string()
      .trim()
      .min(1, 'Describe cómo se reconoce en campo.')
      .max(
        PEST_DISEASE_DESCRIPTION_MAX_LENGTH,
        maxLength(PEST_DISEASE_DESCRIPTION_MAX_LENGTH),
      ),
    // Lo que la planilla del monitoreo propone al elegirla: qué se cuenta para medirla y qué
    // control se suele aplicar. Es una ayuda: quien registra puede cambiarla.
    suggested_sampling_unit: z.enum(['', ...SUGGESTED_UNITS] as [
      '',
      ...('trees' | 'pods')[],
    ]),
    suggested_control_method: z.enum(['', ...suggestedMethods] as [
      '',
      ...(typeof suggestedMethods)[number][],
    ]),
  });

export type PestDiseaseFormInput = z.input<
  ReturnType<typeof createPestDiseaseFormSchema>
>;
export type PestDiseaseFormValues = z.output<
  ReturnType<typeof createPestDiseaseFormSchema>
>;

// El nombre científico vacío se guarda como "sin nombre científico".
export const toPestDiseaseRequest = (
  values: PestDiseaseFormValues,
): PestDiseaseCreateRequest => ({
  name: values.name,
  // El esquema ya rechazó el tipo vacío.
  kind: values.kind as PestDiseaseCreateRequest['kind'],
  scientific_name: values.scientific_name || null,
  description: values.description,
  suggested_sampling_unit: values.suggested_sampling_unit || null,
  suggested_control_method: values.suggested_control_method || null,
});
